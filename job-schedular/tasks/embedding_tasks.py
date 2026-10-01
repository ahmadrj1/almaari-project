import uuid
from datetime import datetime
from celery_app import celery_app
from core.database import SessionLocal
from sqlalchemy.orm import joinedload
from services.embedding_service import generate_embedding, serialize_product
from models import Product, ProductVariant, ProductEmbedding


@celery_app.task(name="tasks.embedding_tasks.generate_product_embedding_task", bind=True)
def generate_product_embedding_task(self, product_id: str):
    db = SessionLocal()
    try:
        product = (
            db.query(Product)
            .options(
                joinedload(Product.category),
                joinedload(Product.variants).joinedload(ProductVariant.color),
                joinedload(Product.variants).joinedload(ProductVariant.size),
                joinedload(Product.embedding),
            )
            .filter(Product.id == product_id)
            .first()
        )

        if not product:
            print(f"[EMBEDDING TASK] Product {product_id} not found, skipping.")
            return

        if product.deletedAt is not None:
            if product.embedding:
                db.delete(product.embedding)
                db.commit()
            print(f"[EMBEDDING TASK] Removed embedding for soft-deleted product {product_id}")
            return

        variants = [
            {
                "sku": v.sku,
                "stock": v.stock,
                "color_name": v.color.name if v.color else "",
                "size_name": v.size.name if v.size else "",
            }
            for v in product.variants
        ]

        content = serialize_product(
            title=product.title,
            description=product.description,
            price=product.price,
            category_name=product.category.name if product.category else None,
            variants=variants,
        )

        vector = generate_embedding(content)
        if not vector or len(vector) != 384:
            raise ValueError(f"Invalid embedding vector length: {len(vector) if vector else 0}")

        if product.embedding:
            product.embedding.content = content
            product.embedding.embedding = vector
            product.embedding.updatedAt = datetime.utcnow()
        else:
            embedding_record = ProductEmbedding(
                id=str(uuid.uuid4()),
                productId=product_id,
                content=content,
                embedding=vector,
                updatedAt=datetime.utcnow(),
            )
            db.add(embedding_record)

        db.commit()
        print(f"[EMBEDDING TASK] Saved 384-d embedding for product: {product.title} ({product_id})")

    except Exception as e:
        db.rollback()
        print(f"[EMBEDDING TASK ERROR] Failed to generate embedding for product {product_id}: {str(e)}")
        raise e
    finally:
        db.close()
