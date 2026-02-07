import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

interface Product {
  id: number
  name: string
  price: number
  description: string
  imageUrl: string
}

function formatPrice(price: number): string {
  return price.toFixed(2)
}

function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    fetch("/api/products/" + id)
      .then((res) => {
        if (!res.ok) throw new Error('Product not found')
        return res.json()
      })
      .then((data) => {
        setProduct(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-600">
        <p>Loading product...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="text-center py-16 text-red-600">
        <p>{error || 'Product not found'}</p>
        <Link
          to="/"
          className="inline-block mt-4 text-blue-500 hover:text-blue-600"
        >
          ← Back to Products
        </Link>
      </div>
    )
  }

  const fallbackImage = "https://picsum.photos/seed/" + product.id + "/600/400"

  return (
    <div>
      <Link
        to="/"
        className="inline-block mb-4 text-blue-500 hover:text-blue-600"
      >
        ← Back to Products
      </Link>
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="md:flex md:gap-8">
          <div className="md:w-1/2 mb-6 md:mb-0">
            <div className="w-full h-72 bg-gray-200 rounded-lg overflow-hidden">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = fallbackImage
                }}
              />
            </div>
          </div>
          <div className="md:w-1/2">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              {product.name}
            </h2>
            <p className="text-3xl text-green-600 font-bold mb-4">
              {"$" + formatPrice(product.price)}
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {product.description || 'No description available.'}
            </p>
            <button className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
