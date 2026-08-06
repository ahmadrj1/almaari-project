import * as React from "react"

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-white py-8">
      <div className="container mx-auto px-4 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Almaari. All rights reserved.</p>
      </div>
    </footer>
  )
}
