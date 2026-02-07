"""SQLAdmin configuration for the store."""

from sqladmin import ModelView

from .models import Product


class ProductAdmin(ModelView, model=Product):
    """Admin view for Product model."""

    name = "Product"
    name_plural = "Products"
    icon = "fa-solid fa-box"

    column_list = [Product.id, Product.name, Product.price, Product.created_at]
    column_searchable_list = [Product.name, Product.description]
    column_sortable_list = [Product.id, Product.name, Product.price, Product.created_at]

    form_columns = [Product.name, Product.price, Product.description, Product.image]
