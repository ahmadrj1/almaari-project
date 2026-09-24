from typing import List, Dict, Any, Optional

_embedder = None


def get_embedder():
    global _embedder
    if _embedder is None:
        from fastembed import TextEmbedding
        _embedder = TextEmbedding(model_name="sentence-transformers/all-mpnet-base-v2")
    return _embedder


def generate_embedding(text: str) -> List[float]:
    embedder = get_embedder()
    vectors = list(embedder.embed([text]))
    if not vectors:
        return []
    return vectors[0].tolist()


def serialize_product(
    title: str,
    description: Optional[str],
    price: Any,
    category_name: Optional[str],
    variants: List[Dict[str, Any]],
) -> str:
    parts = [
        f"Title: {title}",
        f"Description: {description.strip()}" if description and description.strip() else "",
        f"Price: {price}",
        f"Category: {category_name.strip()}" if category_name and category_name.strip() else "",
    ]

    variant_parts = [
        f"{v.get('color_name', '')} / {v.get('size_name', '')} (SKU: {v.get('sku', '')}, Stock: {v.get('stock', 0)})"
        for v in variants
        if v.get("color_name") and v.get("size_name")
    ]
    if variant_parts:
        parts.append(f"Variants: {', '.join(variant_parts)}")

    return ". ".join([p for p in parts if p])
