export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex items-center space-x-4">
            <img src="/logo192.png" alt="Logo" className="h-6 w-6" />
            <span className="text-sm text-gray-600">
              © {currentYear} React Starter. Tous droits réservés.
            </span>
          </div>

          <div className="mt-4 md:mt-0">
            <div className="flex space-x-6">
              <a href="#" className="text-sm text-gray-500 hover:text-gray-600">
                Mentions légales
              </a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-600">
                Confidentialité
              </a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-600">
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 