from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

class ForgotPasswordEmailRequest(BaseModel):
    user_email: EmailStr
    reset_token: str

class OrderStatusEmailRequest(BaseModel):
    order_id: str

class ProductVariantSchema(BaseModel):
    colorName: str = Field(..., min_length=1)
    hexCode: Optional[str] = "#000000"
    sizeName: str = Field(..., min_length=1)
    stock: int = Field(0, ge=0)
    sku: Optional[str] = None

class ProductImageSchema(BaseModel):
    url: str = Field(..., min_length=1)
    colorName: Optional[str] = None
    sortOrder: int = Field(0, ge=0)

class BulkProductItem(BaseModel):
    title: str = Field(..., min_length=1)
    description: str
    price: float = Field(..., gt=0)
    image: str = Field(..., min_length=1)
    categoryName: Optional[str] = None
    sku: Optional[str] = None
    targetProductId: Optional[str] = None
    isUpdate: Optional[bool] = False
    variants: Optional[List[ProductVariantSchema]] = Field(default_factory=list)
    images: Optional[List[ProductImageSchema]] = Field(default_factory=list)

class BulkProductUploadRequest(BaseModel):
    products: List[BulkProductItem]
