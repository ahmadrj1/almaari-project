import uuid
import re
import time
from celery_app import celery_app
from core.database import SessionLocal
from sqlalchemy import text


DEFAULT_COLOR_CODES = {
    "black": "BLK",
    "white": "WHT",
    "navy": "NVY",
    "olive": "OLV",
    "beige": "BGE",
    "green": "GRN",
    "blue": "BLU",
    "yellow": "YLW",
    "pink": "PNK",
    "cyan": "CYN",
    "orange": "ORG",
    "brown": "BRN",
    "gray/silver": "GRY",
    "gray": "GRY",
    "silver": "SLV",
    "red": "RED",
    "purple": "PRP",
    "maroon": "MRN",
    "charcoal": "CHR",
    "gold": "GLD",
}


def extract_title_prefix(title: str) -> str:
    if not title:
        return "PROD"
    first_word = title.strip().split()[0] if title.strip().split() else "PROD"
    cleaned = re.sub(r"[^A-Za-z0-9]", "", first_word).upper()
    if not cleaned:
        return "PROD"
    return cleaned[:4]


def resolve_color_code(name: str) -> str:
    if not name:
        return "DEF"
    lower = name.strip().lower()
    if lower in DEFAULT_COLOR_CODES:
        return DEFAULT_COLOR_CODES[lower]
    cleaned = re.sub(r"[^A-Za-z0-9]", "", name.strip()).upper()
    if len(cleaned) >= 3:
        return cleaned[:3]
    return cleaned.ljust(3, "X")


@celery_app.task(name="tasks.product_tasks.process_bulk_products_task", bind=True)
def process_bulk_products_task(self, products_data: list, action: str = "create"):
    db = SessionLocal()
    processed_count = 0
    errors = []

    try:
        for idx, prod in enumerate(products_data):
            try:
                # Slight rate-limiting pause to keep database traffic minimal
                time.sleep(0.02)

                category_id = None
                category_name = prod.get("categoryName")
                if category_name:
                    cat_res = db.execute(
                        text('SELECT id FROM "Category" WHERE LOWER(name) = LOWER(:name)'),
                        {"name": category_name.strip()},
                    ).fetchone()
                    if cat_res:
                        category_id = cat_res.id
                    else:
                        new_cat_id = str(uuid.uuid4())
                        db.execute(
                            text(
                                'INSERT INTO "Category" (id, name, "createdAt", "updatedAt") VALUES (:id, :name, NOW(), NOW())'
                            ),
                            {"id": new_cat_id, "name": category_name.strip()},
                        )
                        category_id = new_cat_id

                title = prod.get("title", "").strip()
                title_prefix = extract_title_prefix(title)

                target_product_id = prod.get("targetProductId")
                existing_product = None

                if action == "update" or prod.get("isUpdate"):
                    # Find by targetProductId or by matching SKU
                    if target_product_id:
                        existing_product = db.execute(
                            text('SELECT id, "titlePrefix", code, image FROM "Product" WHERE id = :id AND "deletedAt" IS NULL'),
                            {"id": target_product_id},
                        ).fetchone()

                    if not existing_product and prod.get("sku"):
                        sku_val = prod.get("sku", "").strip()
                        # Check variant SKU
                        var_match = db.execute(
                            text('SELECT "productId" FROM "ProductVariant" WHERE sku = :sku'),
                            {"sku": sku_val},
                        ).fetchone()
                        if var_match:
                            existing_product = db.execute(
                                text('SELECT id, "titlePrefix", code, image FROM "Product" WHERE id = :id AND "deletedAt" IS NULL'),
                                {"id": var_match.productId},
                            ).fetchone()

                    if not existing_product and prod.get("sku"):
                        parts = prod.get("sku", "").strip().split("-")
                        if len(parts) >= 2:
                            existing_product = db.execute(
                                text('SELECT id, "titlePrefix", code, image FROM "Product" WHERE "titlePrefix" = :p AND code = :c AND "deletedAt" IS NULL'),
                                {"p": parts[0].upper(), "c": parts[1]},
                            ).fetchone()

                if existing_product:
                    # UPDATE EXISTING PRODUCT
                    product_id = existing_product.id
                    prod_title_prefix = existing_product.titlePrefix
                    prod_code = existing_product.code

                    # If title prefix changed, assign new code with advisory lock
                    if title_prefix != prod_title_prefix:
                        db.execute(
                            text("SELECT pg_advisory_xact_lock(hashtext(:prefix))"),
                            {"prefix": title_prefix},
                        )
                        code_res = db.execute(
                            text('SELECT code FROM "Product" WHERE "titlePrefix" = :p'),
                            {"p": title_prefix},
                        ).fetchall()
                        max_c = 0
                        for row in code_res:
                            try:
                                num = int(row.code)
                                if num > max_c:
                                    max_c = num
                            except (ValueError, TypeError):
                                pass
                        prod_code = str(max_c + 1).zfill(3)
                        prod_title_prefix = title_prefix

                    new_image = prod.get("image")
                    if (not new_image or "unsplash.com" in new_image) and existing_product.image:
                        final_image = existing_product.image
                    else:
                        final_image = new_image or existing_product.image or ""

                    db.execute(
                        text("""
                            UPDATE "Product"
                            SET title = :title, "titlePrefix" = :titlePrefix, code = :code,
                                description = :description, price = :price, image = :image,
                                "categoryId" = :categoryId, "updatedAt" = NOW()
                            WHERE id = :id
                        """),
                        {
                            "id": product_id,
                            "title": title,
                            "titlePrefix": prod_title_prefix,
                            "code": prod_code,
                            "description": prod.get("description", ""),
                            "price": float(prod.get("price")),
                            "image": final_image,
                            "categoryId": category_id,
                        },
                    )
                else:
                    # CREATE NEW PRODUCT
                    db.execute(
                        text("SELECT pg_advisory_xact_lock(hashtext(:prefix))"),
                        {"prefix": title_prefix},
                    )
                    code_res = db.execute(
                        text('SELECT code FROM "Product" WHERE "titlePrefix" = :p'),
                        {"p": title_prefix},
                    ).fetchall()
                    max_c = 0
                    for row in code_res:
                        try:
                            num = int(row.code)
                            if num > max_c:
                                max_c = num
                        except (ValueError, TypeError):
                            pass
                    prod_code = str(max_c + 1).zfill(3)
                    prod_title_prefix = title_prefix

                    product_id = str(uuid.uuid4())
                    db.execute(
                        text("""
                            INSERT INTO "Product" (id, title, "titlePrefix", code, description, price, image, "categoryId", "createdAt", "updatedAt")
                            VALUES (:id, :title, :titlePrefix, :code, :description, :price, :image, :categoryId, NOW(), NOW())
                        """),
                        {
                            "id": product_id,
                            "title": title,
                            "titlePrefix": prod_title_prefix,
                            "code": prod_code,
                            "description": prod.get("description", ""),
                            "price": float(prod.get("price")),
                            "image": prod.get("image"),
                            "categoryId": category_id,
                        },
                    )

                # Handle Variants
                variants = prod.get("variants", [])
                for var in variants:
                    color_name = var.get("colorName", "Default").strip()
                    hex_code = var.get("hexCode", "#000000")
                    size_name = var.get("sizeName", "Standard").strip()
                    stock = int(var.get("stock", 0))

                    # Ensure Color & get 3-letter code
                    col_res = db.execute(
                        text('SELECT id, code FROM "Color" WHERE LOWER(name) = LOWER(:name)'),
                        {"name": color_name},
                    ).fetchone()
                    if col_res:
                        color_id = col_res.id
                        color_code = col_res.code or resolve_color_code(color_name)
                    else:
                        color_id = str(uuid.uuid4())
                        color_code = resolve_color_code(color_name)
                        db.execute(
                            text('INSERT INTO "Color" (id, name, code, "hexCode") VALUES (:id, :name, :code, :hexCode)'),
                            {"id": color_id, "name": color_name, "code": color_code, "hexCode": hex_code},
                        )

                    # Ensure Size
                    size_res = db.execute(
                        text('SELECT id, name FROM "Size" WHERE LOWER(name) = LOWER(:name)'),
                        {"name": size_name},
                    ).fetchone()
                    if size_res:
                        size_id = size_res.id
                        size_code = size_res.name.upper()
                    else:
                        size_id = str(uuid.uuid4())
                        size_code = size_name.upper()
                        db.execute(
                            text('INSERT INTO "Size" (id, name, "sortOrder") VALUES (:id, :name, 0)'),
                            {"id": size_id, "name": size_name},
                        )

                    # Generate SKU: TITLE-CODE-SIZE-COLOR
                    variant_sku = f"{prod_title_prefix}-{prod_code}-{size_code}-{color_code}"

                    # Upsert ProductVariant with SKU
                    var_existing = db.execute(
                        text('SELECT id FROM "ProductVariant" WHERE "productId" = :p AND "colorId" = :c AND "sizeId" = :s'),
                        {"p": product_id, "c": color_id, "s": size_id},
                    ).fetchone()

                    if var_existing:
                        if existing_product:
                            db.execute(
                                text('UPDATE "ProductVariant" SET stock = :stock, sku = :sku WHERE id = :id'),
                                {"id": var_existing.id, "stock": stock, "sku": variant_sku},
                            )
                        else:
                            db.execute(
                                text('UPDATE "ProductVariant" SET stock = stock + :stock, sku = :sku WHERE id = :id'),
                                {"id": var_existing.id, "stock": stock, "sku": variant_sku},
                            )
                    else:
                        variant_id = str(uuid.uuid4())
                        db.execute(
                            text("""
                                INSERT INTO "ProductVariant" (id, "productId", "colorId", "sizeId", stock, sku)
                                VALUES (:id, :productId, :colorId, :sizeId, :stock, :sku)
                            """),
                            {
                                "id": variant_id,
                                "productId": product_id,
                                "colorId": color_id,
                                "sizeId": size_id,
                                "stock": stock,
                                "sku": variant_sku,
                            },
                        )

                # Handle Product Images
                images = prod.get("images", [])
                if images:
                    if existing_product:
                        db.execute(
                            text('DELETE FROM "ProductImage" WHERE "productId" = :pid'),
                            {"pid": product_id},
                        )
                    for img in images:
                        url = img.get("url")
                        if not url:
                            continue
                        img_color_id = None
                        img_color_name = img.get("colorName")
                        if img_color_name:
                            col_res = db.execute(
                                text('SELECT id FROM "Color" WHERE LOWER(name) = LOWER(:name)'),
                                {"name": img_color_name.strip()},
                            ).fetchone()
                            if col_res:
                                img_color_id = col_res.id

                        img_id = str(uuid.uuid4())
                        db.execute(
                            text("""
                                INSERT INTO "ProductImage" (id, "productId", "colorId", url, "sortOrder")
                                VALUES (:id, :productId, :colorId, :url, :sortOrder)
                            """),
                            {
                                "id": img_id,
                                "productId": product_id,
                                "colorId": img_color_id,
                                "url": url,
                                "sortOrder": int(img.get("sortOrder", 0)),
                            },
                        )

                db.commit()
                processed_count += 1
                print(f"[BULK UPLOAD] Processed ({action}) product {processed_count}/{len(products_data)}: {title}")

            except Exception as e:
                db.rollback()
                err_msg = f"Failed product '{prod.get('title')}': {str(e)}"
                print(f"[BULK UPLOAD ERROR] {err_msg}")
                errors.append(err_msg)

        if processed_count > 0 and action == "create":
            try:
                recent = db.execute(
                    text("""
                        SELECT id FROM "Notification"
                        WHERE type = 'NEW_PRODUCT'
                          AND message = 'New products have been added to the catalogue!'
                          AND "createdAt" > NOW() - INTERVAL '2 minutes'
                        LIMIT 1
                    """)
                ).fetchone()
                if not recent:
                    notif_id = str(uuid.uuid4())
                    db.execute(
                        text("""
                            INSERT INTO "Notification" (id, "userId", type, title, message, "isRead", "createdAt")
                            VALUES (:id, NULL, :type, :title, :message, false, NOW())
                        """),
                        {
                            "id": notif_id,
                            "type": "NEW_PRODUCT",
                            "title": "New Products Added!",
                            "message": "New products have been added to the catalogue!",
                        },
                    )
                    db.commit()

                    from services.notification_service import dispatch_socket_notification
                    dispatch_socket_notification({
                        "type": "broadcast",
                        "notification": {
                            "id": notif_id,
                            "userId": None,
                            "type": "NEW_PRODUCT",
                            "title": "New Products Added!",
                            "message": "New products have been added to the catalogue!",
                            "isRead": False,
                        },
                    })
            except Exception as notif_err:
                db.rollback()
                print(f"[BULK UPLOAD NOTIFICATION ERROR] {str(notif_err)}")

    finally:
        db.close()

    return {"total": len(products_data), "processed": processed_count, "errors": errors}
