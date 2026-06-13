import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiBarChart2, FiDollarSign, FiGrid,
  FiHome, FiLogOut, FiPackage, FiShoppingCart, FiUser, FiUsers,
} from 'react-icons/fi';
import { clearAuthSession, getAuthUser } from '../services/api';
import logo from '../assets/logo/logo.png';
import styles from './AdminSidebar.module.css';

const mainItems = [
  { label: 'Dashboard', icon: FiGrid, path: '/admin', adminOnly: false, exact: true },
  { label: 'Vendas', icon: FiBarChart2, path: '/vendas', adminOnly: false },
  { label: 'Usuários', icon: FiUsers, path: '/admin/usuarios', adminOnly: true },
  { label: 'Estoque', icon: FiPackage, path: '/estoque', adminOnly: false },
  { label: 'Faturamento', icon: FiDollarSign, path: '/admin/faturamento-completo', adminOnly: true },
  { label: 'Abandono', icon: FiShoppingCart, path: '/admin/carrinho-abandono', adminOnly: true },
];

function isActive(pathname, path, exact) {
  if (exact) return pathname === path;
  return pathname.startsWith(path);
}

function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const user = getAuthUser();
  const isAdmin = user?.tipo_usuario === 'admin';

  const filteredMain = mainItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <img src={logo} alt="Tres Pescadores Store Logo" className={styles.logo} />
        <div>
          <strong>Tres Pescadores</strong>
          <span>Admin Console</span>
        </div>
      </div>

      <nav className={styles.sidebarNav} aria-label="Menu administrativo">
        <span className={styles.navLabel}>Principal</span>
        {filteredMain.map(item => (
          <button
            key={item.path}
            className={`${styles.navItem} ${isActive(pathname, item.path, item.exact) ? styles.navItemActive : ''}`}
            type="button"
            onClick={() => navigate(item.path)}
          >
            <item.icon /> {item.label}
          </button>
        ))}

        {isAdmin && (
          <span className={styles.navLabel}>Links</span>
        )}
        <button
          className={`${styles.navItem} ${pathname === '/' ? styles.navItemActive : ''}`}
          type="button"
          onClick={() => navigate('/')}
        >
          <FiHome /> Loja
        </button>
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.userCard}>
          <FiUser />
          <div>
            <strong>{user?.nome || 'Usuário'}</strong>
            <span>{isAdmin ? 'Administrador' : 'Funcionário'}</span>
          </div>
        </div>
        <button
          className={styles.logoutButton}
          type="button"
          onClick={() => { clearAuthSession(); navigate('/login'); }}
        >
          <FiLogOut /> Sair
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
