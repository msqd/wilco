from django.shortcuts import render, get_object_or_404
from django.urls import reverse
from wilco.bridges.django import WilcoComponentWidget

from .models import Product


def product_list(request):
    """Homepage showing all products."""
    products = Product.objects.all()

    # Convert products to props for the component
    products_data = [
        {
            "name": p.name,
            "price": float(p.price),
            "description": p.description or "",
            "imageUrl": p.image.url if p.image else "https://picsum.photos/seed/{}/600/400".format(p.pk),
            "url": reverse("store:product_detail", args=[p.pk]),
        }
        for p in products
    ]

    widget = WilcoComponentWidget(
        "store:product_list",
        props={"products": products_data, "title": "Our Products"},
    )

    return render(request, "store/product_list.html", {"widget": widget})


def product_detail(request, pk):
    """Product detail page."""
    product = get_object_or_404(Product, pk=pk)

    widget = WilcoComponentWidget(
        "store:product",
        props={
            "name": product.name,
            "price": float(product.price),
            "description": product.description or "",
            "imageUrl": product.image.url if product.image else "https://picsum.photos/seed/{}/600/400".format(product.pk),
            "mode": "detail",
        },
    )

    return render(
        request, "store/product_detail.html", {"product": product, "widget": widget}
    )
