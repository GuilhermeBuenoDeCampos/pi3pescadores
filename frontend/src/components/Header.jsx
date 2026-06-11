import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBoxOpen, FaClipboardList, FaMapMarkerAlt, FaShoppingCart, FaSignOutAlt, FaUserCircle } from 'react-icons/fa';
import styles from './Header.module.css';
import logo from '../assets/logo/logo.png';
import { useCart } from '../context/CartContext';
import { clearAuthSession, getAuthToken, getAuthUser } from '../services/api';

function Header() {
  const { cart } = useCart ? useCart() : { cart: { items: [] } };
  const [user, setUser] = useState(() => (getAuthToken() ? getAuthUser() : null));
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleAuthChange = () => {
      setUser(getAuthToken() ? getAuthUser() : null);
      setIsUserMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('auth-session-changed', handleAuthChange);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('auth-session-changed', handleAuthChange);
    };
  }, []);

  function handleLogout() {
    clearAuthSession({ rotateGuestToken: true });
    setUser(null);
    setIsUserMenuOpen(false);
  }

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <img src={logo} alt="Logo Tres Pescadores" className={styles.logoMark} />
        <div>
          <Link to="/" className={`${styles.title} ${user ? styles.loggedInTitle : ''}`}>
            Tres Pescadores Store
          </Link>
          <p className={styles.subtitle}>Artigos religiosos para fe e devocao</p>
        </div>
      </div>
      <nav className={styles.navLinks}>
        <Link to="/" className={styles.desktopNavLink} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Inicio</Link>
        <a href="#categories" className={styles.desktopNavLink}>Categorias</a>
        <a href="#catalog" className={styles.desktopNavLink}>Catalogo</a>
        {user ? (
          <div className={styles.userMenu} ref={userMenuRef}>
            <button
              type="button"
              className={styles.userButton}
              aria-label="Menu do usuario"
              aria-expanded={isUserMenuOpen}
              onClick={() => setIsUserMenuOpen((current) => !current)}
            >
              <FaUserCircle size={25} />
            </button>
            {isUserMenuOpen && (
              <div className={styles.userDropdown}>
                <div className={styles.userSummary}>
                  <strong>{user.nome || 'Minha conta'}</strong>
                  <span>{user.email}</span>
                </div>
                <Link to="/meus-pedidos" onClick={() => setIsUserMenuOpen(false)}>
                  <FaBoxOpen size={14} />
                  Meus pedidos
                </Link>
                <Link to="/meus-enderecos" onClick={() => setIsUserMenuOpen(false)}>
                  <FaMapMarkerAlt size={14} />
                  Meus enderecos
                </Link>
                {user.tipo_usuario === 'admin' && (
                  <Link to="/admin" onClick={() => setIsUserMenuOpen(false)}>
                    <FaClipboardList size={14} />
                    Painel Administrativo
                  </Link>
                )}
                {user.tipo_usuario === 'funcionario' && (
                  <Link to="/estoque" onClick={() => setIsUserMenuOpen(false)}>
                    <FaClipboardList size={14} />
                    Gerenciar Estoque
                  </Link>
                )}
                <button type="button" onClick={handleLogout}>
                  <FaSignOutAlt size={14} />
                  Sair
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.authLinks}>
            <Link to="/login">Entrar</Link>
            <Link to="/cadastro" className={styles.registerLink}>Cadastrar</Link>
          </div>
        )}
        <Link to="/carrinho" className={styles.cartIcon} aria-label="Carrinho">
          <FaShoppingCart size={22} />
          {itemCount > 0 && (
            <span className={styles.cartCount}>{itemCount}</span>
          )}
        </Link>
      </nav>
    </header>
  );
}

export default Header;
