import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBoxOpen, FaClipboardList, FaMapMarkerAlt, FaShoppingCart, FaSignOutAlt, FaUserCircle } from 'react-icons/fa';
import styles from './Header.module.css';
import logo from '../assets/logo/logo.png';
import { useCart } from '../context/CartContext';
import { clearAuthSession, getAuthToken, getAuthUser } from '../services/api';

function Header() {
  const { cart } = useCart ? useCart() : { cart: { items: [] } };
  const navigate = useNavigate();
  const [user, setUser] = useState(() => (getAuthToken() ? getAuthUser() : null));
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  useEffect(() => {
    const handleSessionChange = () => {
      setUser(getAuthToken() ? getAuthUser() : null);
      setIsUserMenuOpen(false);
    };

    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    window.addEventListener('auth-session-changed', handleSessionChange);
    window.addEventListener('storage', handleSessionChange);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('auth-session-changed', handleSessionChange);
      window.removeEventListener('storage', handleSessionChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function handleLogout() {
    clearAuthSession({ rotateGuestToken: true });
    setUser(null);
    setIsUserMenuOpen(false);
    navigate('/', { replace: true });
  }

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <img src={logo} alt="Logo Três Pescadores" className={styles.logoMark} />
        <div>
          <Link to="/" className={styles.title}>
            Três Pescadores Store
          </Link>
          <p className={styles.subtitle}>Artigos religiosos para fé e devoção</p>
        </div>
      </div>
      <nav className={styles.navLinks}>
        <Link to="/">Início</Link>
        <a href="#categories">Categorias</a>
        <a href="#catalog">Catálogo</a>
        {user ? (
          <div className={styles.userMenu} ref={userMenuRef}>
            <button
              type="button"
              className={styles.userButton}
              aria-label="Menu do usuário"
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
                {user.tipo_usuario === 'cliente' && (
                  <>
                    <Link to="/meus-pedidos" onClick={() => setIsUserMenuOpen(false)}>
                      <FaBoxOpen size={14} />
                      Meus pedidos
                    </Link>
                    <Link to="/meus-enderecos" onClick={() => setIsUserMenuOpen(false)}>
                      <FaMapMarkerAlt size={14} />
                      Meus endereços
                    </Link>
                  </>
                )}
                {user.tipo_usuario === 'admin' && (
                  <Link to="/admin" onClick={() => setIsUserMenuOpen(false)}>
                    <FaClipboardList size={14} />
                    Painel administrativo
                  </Link>
                )}
                {user.tipo_usuario === 'funcionario' && (
                  <Link to="/estoque" onClick={() => setIsUserMenuOpen(false)}>
                    <FaClipboardList size={14} />
                    Gerenciar estoque
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
