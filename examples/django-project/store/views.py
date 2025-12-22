from django.shortcuts import render, get_object_or_404

from .models import Product


def product_list(request):
    """Homepage showing all products."""
    products = Product.objects.all()
    return render(request, "store/product_list.html", {"products": products})


def product_detail(request, pk):
    """Product detail page."""
    product = get_object_or_404(Product, pk=pk)
    return render(request, "store/product_detail.html", {"product": product})
