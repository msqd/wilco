import { Link } from 'react-router-dom'

interface ProductCardProps {
  id: number
  name: string
  price: number
  description: string
  imageUrl: string
}

function formatPrice(price: number): string {
  return price.toFixed(2)
}

function ProductCard({ id, name, price, imageUrl }: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
      <Link to={"/product/" + id} className="block no-underline text-inherit">
        <div className="w-full h-48 bg-gray-200">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = "https://picsum.photos/seed/" + id + "/600/400"
            }}
          />
        </div>
        <div className="p-4">
          <h3 className="text-lg font-medium mb-2 text-gray-800">{name}</h3>
          <p className="text-green-600 font-bold text-xl">{"$" + formatPrice(price)}</p>
        </div>
      </Link>
    </div>
  )
}

export default ProductCard
