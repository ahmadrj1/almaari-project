import uuid
from celery_app import celery_app
from core.database import SessionLocal
from sqlalchemy import text
from services.embedding_service import generate_embedding, serialize_product


@celery_app.task(name="tasks.embedding_tasks.generate_product_embedding_task", bind=True)
def generate_product_embedding_task(self, product_id: str):
    db = SessionLocal()
    try:
        prod_row = db.execute(
            text("""
                SELECT p.id, p.title, p.description, p.price, p."deletedAt", c.name as category_name
                FROM "Product" p
                LEFT JOIN "Category" c ON p."categoryId" = c.id
                WHERE p.id = :pid
            """),
            {"pid": product_id},
        ).fetchone()

        if not prod_row:
            print(f"[EMBEDDING TASK] Product {product_id} not found, skipping.")
            return

        if prod_row.deletedAt is not None:
            db.execute(
                text('DELETE FROM "ProductEmbedding" WHERE "productId" = :pid'),
                {"pid": product_id},
            )
            db.commit()
            print(f"[EMBEDDING TASK] Removed embedding for soft-deleted product {product_id}")
            return

        variants_rows = db.execute(
            text("""
                SELECT pv.sku, pv.stock, col.name as color_name, sz.name as size_name
                FROM "ProductVariant" pv
                LEFT JOIN "Color" col ON pv."colorId" = col.id
                LEFT JOIN "Size" sz ON pv."sizeId" = sz.id
                WHERE pv."productId" = :pid
            """),
            {"pid": product_id},
        ).fetchall()

        variants = [
            {
                "sku": v.sku,
                "stock": v.stock,
                "color_name": v.color_name,
                "size_name": v.size_name,
            }
            for v in variants_rows
        ]

        content = serialize_product(
            title=prod_row.title,
            description=prod_row.description,
            price=prod_row.price,
            category_name=prod_row.category_name,
            variants=variants,
        )

        vector = generate_embedding(content)
        if not vector or len(vector) != 384:
            raise ValueError(f"Invalid embedding vector length: {len(vector) if vector else 0}")

        import json as _json

        emb_id = str(uuid.uuid4())
        db.execute(
            text("""
                INSERT INTO "ProductEmbedding" (id, "productId", content, embedding, "updatedAt")
                VALUES (:id, :productId, :content, CAST(:embedding AS jsonb), NOW())
                ON CONFLICT ("productId")
                DO UPDATE SET
                    content = EXCLUDED.content,
                    embedding = EXCLUDED.embedding,
                    "updatedAt" = NOW()
            """),
            {
                "id": emb_id,
                "productId": product_id,
                "content": content,
                "embedding": _json.dumps(vector),
            },
        )
        db.commit()
        print(f"[EMBEDDING TASK] Saved 384-d embedding for product: {prod_row.title} ({product_id})")

    except Exception as e:
        db.rollback()
        print(f"[EMBEDDING TASK ERROR] Failed to generate embedding for product {product_id}: {str(e)}")
        raise e
    finally:
        db.close()
