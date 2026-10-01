import uuid
import re
import time
from datetime import datetime, timedelta
from celery_app import celery_app
from core.database import SessionLocal
from sqlalchemy import func
from models import (
    Product,
    Category,
    Color,
    Size,
    ProductVariant,
    ProductImage,
    Notification,
)


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
                    clean_cat = category_name.strip()
                    cat = db.query(Category).filter(func.lower(Category.name) == func.lower(clean_cat)).first()
                    if cat:
                        category_id = cat.id
                    else:
                        new_cat = Category(id=str(uuid.uuid4()), name=clean_cat)
                        db.add(new_cat)
                        db.flush()
                        category_id = new_cat.id

                title = prod.get("title", "").strip()
                title_prefix = extract_title_prefix(title)

                target_product_id = prod.get("targetProductId")
                existing_product = None

                if action == "update" or prod.get("isUpdate"):
                    if target_product_id:
                        existing_product = db.query(Product).filter(
                            Product.id == target_product_id,
                            Product.deletedAt.is_(None)
                        ).first()

                    if not existing_product and prod.get("sku"):
                        sku_val = prod.get("sku", "").strip()
                        var_match = db.query(ProductVariant).filter(ProductVariant.sku == sku_val).first()
                        if var_match:
                            existing_product = db.query(Product).filter(
                                Product.id == var_match.productId,
                                Product.deletedAt.is_(None)
                            ).first()

                    if not existing_product and prod.get("sku"):
                        parts = prod.get("sku", "").strip().split("-")
                        if len(parts) >= 2:
                            existing_product = db.query(Product).filter(
                                Product.titlePrefix == parts[0].upper(),
                                Product.code == parts[1],
                                Product.deletedAt.is_(None)
                            ).first()

                if existing_product:
                    product_id = existing_product.id
                    prod_title_prefix = existing_product.titlePrefix
                    prod_code = existing_product.code

                    if title_prefix != prod_title_prefix:
                        code_res = db.query(Product.code).filter(Product.titlePrefix == title_prefix).all()
                        max_c = 0
                        for row in code_res:
                            try:
                                num = int(row[0])
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

                    existing_product.title = title
                    existing_product.titlePrefix = prod_title_prefix
                    existing_product.code = prod_code
                    existing_product.description = prod.get("description", "")
                    existing_product.price = float(prod.get("price"))
                    existing_product.image = final_image
                    existing_product.categoryId = category_id
                    existing_product.updatedAt = datetime.utcnow()
                else:
                    code_res = db.query(Product.code).filter(Product.titlePrefix == title_prefix).all()
                    max_c = 0
                    for row in code_res:
                        try:
                            num = int(row[0])
                            if num > max_c:
                                max_c = num
                        except (ValueError, TypeError):
                            pass
                    prod_code = str(max_c + 1).zfill(3)
                    prod_title_prefix = title_prefix

                    product_id = str(uuid.uuid4())
                    new_product = Product(
                        id=product_id,
                        title=title,
                        titlePrefix=prod_title_prefix,
                        code=prod_code,
                        description=prod.get("description", ""),
                        price=float(prod.get("price")),
                        image=prod.get("image") or "",
                        categoryId=category_id,
                        createdAt=datetime.utcnow(),
                        updatedAt=datetime.utcnow(),
                    )
                    db.add(new_product)

                # Handle Variants
                variants = prod.get("variants", [])
                for var in variants:
                    color_name = var.get("colorName", "Default").strip()
                    hex_code = var.get("hexCode", "#000000")
                    size_name = var.get("sizeName", "Standard").strip()
                    stock = int(var.get("stock", 0))

                    col = db.query(Color).filter(func.lower(Color.name) == func.lower(color_name)).first()
                    if col:
                        color_id = col.id
                        color_code = col.code or resolve_color_code(color_name)
                    else:
                        color_id = str(uuid.uuid4())
                        color_code = resolve_color_code(color_name)
                        new_col = Color(id=color_id, name=color_name, code=color_code, hexCode=hex_code)
                        db.add(new_col)
                        db.flush()

                    sz = db.query(Size).filter(func.lower(Size.name) == func.lower(size_name)).first()
                    if sz:
                        size_id = sz.id
                        size_code = sz.name.upper()
                    else:
                        size_id = str(uuid.uuid4())
                        size_code = size_name.upper()
                        new_sz = Size(id=size_id, name=size_name, sortOrder=0)
                        db.add(new_sz)
                        db.flush()

                    variant_sku = f"{prod_title_prefix}-{prod_code}-{size_code}-{color_code}"

                    var_existing = db.query(ProductVariant).filter(
                        ProductVariant.productId == product_id,
                        ProductVariant.colorId == color_id,
                        ProductVariant.sizeId == size_id,
                    ).first()

                    if var_existing:
                        var_existing.stock += stock
                        var_existing.sku = variant_sku
                    else:
                        new_var = ProductVariant(
                            id=str(uuid.uuid4()),
                            productId=product_id,
                            colorId=color_id,
                            sizeId=size_id,
                            stock=stock,
                            sku=variant_sku,
                        )
                        db.add(new_var)

                # Handle Product Images
                images = prod.get("images", [])
                if images:
                    if existing_product:
                        db.query(ProductImage).filter(ProductImage.productId == product_id).delete()
                    for img in images:
                        url = img.get("url")
                        if not url:
                            continue
                        img_color_id = None
                        img_color_name = img.get("colorName")
                        if img_color_name:
                            col_res = db.query(Color).filter(func.lower(Color.name) == func.lower(img_color_name.strip())).first()
                            if col_res:
                                img_color_id = col_res.id

                        img_id = str(uuid.uuid4())
                        new_img = ProductImage(
                            id=img_id,
                            productId=product_id,
                            colorId=img_color_id,
                            url=url,
                            sortOrder=int(img.get("sortOrder", 0)),
                        )
                        db.add(new_img)

                db.commit()
                processed_count += 1
                print(f"[BULK UPLOAD] Processed ({action}) product {processed_count}/{len(products_data)}: {title}")

                try:
                    from tasks.embedding_tasks import generate_product_embedding_task
                    generate_product_embedding_task.delay(product_id)
                except Exception as emb_err:
                    print(f"[BULK UPLOAD WARNING] Failed to enqueue embedding for {product_id}: {emb_err}")

            except Exception as e:
                db.rollback()
                err_msg = f"Failed product '{prod.get('title')}': {str(e)}"
                print(f"[BULK UPLOAD ERROR] {err_msg}")
                errors.append(err_msg)

        if processed_count > 0 and action == "create":
            try:
                two_minutes_ago = datetime.utcnow() - timedelta(minutes=2)
                recent = (
                    db.query(Notification)
                    .filter(
                        Notification.type == "NEW_PRODUCT",
                        Notification.message == "New products have been added to the catalogue!",
                        Notification.createdAt > two_minutes_ago,
                    )
                    .first()
                )
                if not recent:
                    notif_id = str(uuid.uuid4())
                    new_notif = Notification(
                        id=notif_id,
                        userId=None,
                        type="NEW_PRODUCT",
                        title="New Products Added!",
                        message="New products have been added to the catalogue!",
                        isRead=False,
                        createdAt=datetime.utcnow(),
                    )
                    db.add(new_notif)
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
