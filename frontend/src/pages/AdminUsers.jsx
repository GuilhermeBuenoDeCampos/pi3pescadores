import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  FiUser,
  FiUserPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiCheck,
  FiClipboard,
  FiX,
  FiAlertCircle,
  FiUsers,
  FiLoader,
  FiArrowLeft,
  FiLogOut,
  FiDownload,
  FiFileText,
  FiGrid,
  FiActivity,
  FiBriefcase,
  FiChevronDown,
  FiClock,
  FiHome,
  FiKey,
  FiLock,
  FiMoreVertical,
  FiShield,
  FiSliders,
  FiUserCheck,
  FiUserX,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import {
  clearAuthSession,
  fetchUsuarios,
  criarUsuario,
  atualizarUsuario,
  excluirUsuario,
  getAuthUser,
} from '../services/api';
import logo from '../assets/logo/logo.png';
import styles from './AdminUsers.module.css';
import { exportToPDF, exportToSVG, exportToXLSX } from '../utils/exportUtils';

const emptyForm = {
  tipo: '',
  nome: '',
  email: '',
  telefone: '',
  cpf: '',
  senha: '',
  confirmarSenha: '',
};

function crudApp() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [errors, setErrors] = useState({});
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [toasts, setToasts] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ open: false, userId: null, userName: '' });
  const [saving, setSaving] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [openActionUserId, setOpenActionUserId] = useState(null);
  const downloadRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (downloadRef.current && !downloadRef.current.contains(e.target)) {
        setDownloadOpen(false);
      }
    }
    if (downloadOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [downloadOpen]);

  useEffect(() => {
    if (!openActionUserId) return undefined;

    function closeActionsOnOutsideClick(e) {
      if (!e.target.closest('[data-user-action-menu]')) {
        setOpenActionUserId(null);
      }
    }

    document.addEventListener('mousedown', closeActionsOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeActionsOnOutsideClick);
  }, [openActionUserId]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsuarios();
      setUsers(data);
    } catch (err) {
      showToast('error', 'Erro ao carregar usuários: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter(u => {
      if (typeFilter && (u.tipo_usuario || '') !== typeFilter) return false;
      if (!q) return true;
      return (
        u.nome.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.cpf || '').includes(q) ||
        (u.telefone || '').includes(q) ||
        (u.tipo_usuario || '').toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, typeFilter]);

  const showToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const resetForm = useCallback(() => {
    setForm({ ...emptyForm });
    setErrors({});
    setEditingId(null);
    setSelectedUserId('');
  }, []);

  const openNewForm = useCallback(() => {
    resetForm();
    setShowForm(true);
  }, [resetForm]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }, [errors]);

  const maskTelefone = useCallback((value) => {
    let nums = value.replace(/\D/g, '');
    if (nums.length > 11) nums = nums.slice(0, 11);
    if (nums.length > 6) return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
    if (nums.length > 2) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    if (nums.length > 0) return `(${nums}`;
    return nums;
  }, []);

  const maskCpf = useCallback((value) => {
    let nums = value.replace(/\D/g, '');
    if (nums.length > 11) nums = nums.slice(0, 11);
    if (nums.length > 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
    if (nums.length > 6) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
    if (nums.length > 3) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
    return nums;
  }, []);

  const handlePhoneChange = useCallback((e) => {
    setForm(prev => ({ ...prev, telefone: maskTelefone(e.target.value) }));
    if (errors.telefone) setErrors(prev => ({ ...prev, telefone: '' }));
  }, [maskTelefone, errors]);

  const handleCpfChange = useCallback((e) => {
    setForm(prev => ({ ...prev, cpf: maskCpf(e.target.value) }));
    if (errors.cpf) setErrors(prev => ({ ...prev, cpf: '' }));
  }, [maskCpf, errors]);

  const validarCpf = useCallback((cpf) => {
    const nums = cpf.replace(/\D/g, '');
    if (nums.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(nums)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(nums[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== parseInt(nums[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(nums[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== parseInt(nums[10])) return false;
    return true;
  }, []);

  const validate = useCallback(() => {
    const err = {};
    if (!form.tipo) err.tipo = 'Selecione o tipo de usuário';
    if (!form.nome || form.nome.trim().length < 3) err.nome = 'Informe o nome (mínimo 3 caracteres)';
    if (!form.email) err.email = 'Informe o e-mail';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) err.email = 'Formato de e-mail inválido';
    if (!form.telefone) err.telefone = 'Informe o telefone';
    else if (form.telefone.replace(/\D/g, '').length < 10) err.telefone = 'Telefone incompleto';
    if (!form.cpf) err.cpf = 'Informe o CPF';
    else if (!validarCpf(form.cpf)) err.cpf = 'CPF inválido';
    if (!editingId) {
      if (!form.senha) err.senha = 'Informe a senha';
      else if (form.senha.length < 6) err.senha = 'Mínimo 6 caracteres';
      if (!form.confirmarSenha) err.confirmarSenha = 'Confirme a senha';
      else if (form.senha !== form.confirmarSenha) err.confirmarSenha = 'Senhas não conferem';
    } else if (form.senha) {
      if (form.senha.length < 6) err.senha = 'Mínimo 6 caracteres';
      if (form.senha !== form.confirmarSenha) err.confirmarSenha = 'Senhas não conferem';
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  }, [form, editingId, validarCpf]);

  const saveUser = useCallback(async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);

    const tipoMap = {
      'Cliente': 'cliente',
      'Funcionário': 'funcionario',
      'Admin': 'admin',
    };

    const userData = {
      nome: form.nome.trim(),
      email: form.email.trim().toLowerCase(),
      telefone: form.telefone,
      cpf: form.cpf,
      tipo_usuario: tipoMap[form.tipo] || 'cliente',
    };

    try {
      if (editingId) {
        const updateData = { ...userData };
        if (form.senha) updateData.senha = form.senha;
        await atualizarUsuario(editingId, updateData);
        showToast('success', 'Usuário atualizado com sucesso!');
      } else {
        await criarUsuario({ ...userData, senha: form.senha });
        showToast('success', 'Usuário cadastrado com sucesso!');
      }
      setShowForm(false);
      resetForm();
      loadUsers();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, validate, showToast, resetForm, loadUsers]);

  const tipoDisplay = useCallback((val) => {
    const map = { 'admin': 'Admin', 'cliente': 'Cliente', 'funcionario': 'Funcionário' };
    return map[val] || val;
  }, []);

  const editUser = useCallback((id) => {
    const u = users.find(x => x.id === id);
    if (!u) return;
    setForm({
      tipo: tipoDisplay(u.tipo_usuario),
      nome: u.nome || '',
      email: u.email || '',
      telefone: u.telefone || '',
      cpf: u.cpf || '',
      senha: '',
      confirmarSenha: '',
    });
    setEditingId(u.id);
    setSelectedUserId(String(u.id));
    setErrors({});
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [users, tipoDisplay]);

  const handleSelectUser = useCallback((e) => {
    const val = e.target.value;
    setSelectedUserId(val);
    if (val) editUser(val);
  }, [editUser]);

  const askDelete = useCallback((u) => {
    setDeleteModal({ open: true, userId: u.id, userName: u.nome });
  }, []);

  const confirmDelete = useCallback(async () => {
    try {
      await excluirUsuario(deleteModal.userId);
      showToast('success', 'Usuário desativado com sucesso!');
      if (editingId === deleteModal.userId) {
        resetForm();
        setShowForm(false);
      }
      loadUsers();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setDeleteModal({ open: false, userId: null, userName: '' });
    }
  }, [deleteModal, showToast, editingId, resetForm, loadUsers]);

  const cancelDelete = useCallback(() => {
    setDeleteModal({ open: false, userId: null, userName: '' });
  }, []);

  const formatDate = useCallback((iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }, []);

  const handleDownload = useCallback(async (format) => {
    setDownloadOpen(false);
    const fn = `usuarios_${new Date().toISOString().slice(0, 10)}`;
    if (format === 'pdf') {
      let logoBase64 = null;
      try {
        const resp = await fetch(logo);
        const blob = await resp.blob();
        logoBase64 = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch {}
      const user = getAuthUser();
      exportToPDF(filteredUsers, `${fn}.pdf`, {
        logoBase64,
        userName: user?.nome || '',
        userType: user?.tipo_usuario || '',
      });
    } else if (format === 'svg') exportToSVG(filteredUsers, `${fn}.svg`);
    else if (format === 'xlsx') exportToXLSX(filteredUsers, `${fn}.xlsx`);
  }, [filteredUsers]);

  const summary = useMemo(() => ({
    total: users.length,
    admins: users.filter(user => user.tipo_usuario === 'admin').length,
    active: users.filter(user => user.ativo !== false).length,
    inactive: users.filter(user => user.ativo === false).length,
  }), [users]);

  const getInitials = useCallback((name) => String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'U', []);

  const formatLastAccess = useCallback((iso) => {
    if (!iso) return 'Nunca acessou';
    return formatDate(iso);
  }, [formatDate]);

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src={logo} alt="Tres Pescadores Store Logo" className={styles.logo} />
          <div>
            <strong>Tres Pescadores</strong>
            <span>Painel administrativo</span>
          </div>
        </div>
        <nav className={styles.nav} aria-label="Administração de usuários">
          <span className={styles.navLabel}>Painel</span>
          <button className={styles.navItem} type="button" onClick={() => navigate('/admin')}><FiHome /> Visão geral</button>
          <span className={styles.navLabel}>Usuários</span>
          <button className={`${styles.navItem} ${styles.navActive}`} type="button"><FiUsers /> Todos os usuários</button>
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.signedUser}>
            <FiUser />
            <div>
              <strong>{getAuthUser()?.nome || 'Usuário'}</strong>
              <span>Administrador</span>
            </div>
          </div>
          <button className={styles.logout} type="button" onClick={() => { clearAuthSession(); navigate('/login'); }}>
            <FiLogOut /> Sair
          </button>
        </div>
      </aside>

      <div className={styles.mainArea}>
        <header className={styles.header}>
          <div className={styles.titleContainer}>
            <p className={styles.breadcrumb}>Administração / Usuários</p>
            <h1>Gerenciamento de usuários</h1>
            <p className={styles.subtitle}>Gerencie usuários, cargos e permissões do sistema</p>
          </div>
          <div className={styles.headerActions}>
            <button className={`${styles.btn} ${styles.btnLight}`} type="button" onClick={() => navigate('/admin')}>
              <FiArrowLeft /> Voltar
            </button>
            <div className={styles.downloadContainer} ref={downloadRef}>
              <button className={`${styles.btn} ${styles.btnLight}`} type="button" onClick={() => setDownloadOpen(open => !open)}>
                <FiDownload /> Exportar <FiChevronDown />
              </button>
              {downloadOpen && (
                <div className={styles.dropdownMenu}>
                  <button className={styles.dropdownItem} onClick={() => handleDownload('pdf')}><FiFileText /> PDF</button>
                  <button className={styles.dropdownItem} onClick={() => handleDownload('svg')}><FiGrid /> SVG</button>
                  <button className={styles.dropdownItem} onClick={() => handleDownload('xlsx')}><FiFileText /> XLSX</button>
                </div>
              )}
            </div>
            <button className={`${styles.btn} ${styles.btnBlue}`} type="button" onClick={openNewForm}>
              <FiUserPlus /> Novo Usuário
            </button>
          </div>
        </header>

        <main className={styles.content}>
          <section className={styles.summaryGrid} aria-label="Resumo de usuários">
            <article className={styles.summaryCard}>
              <span className={`${styles.summaryIcon} ${styles.iconIndigo}`}><FiUsers /></span>
              <div><p>Total de Usuários</p><strong>{summary.total}</strong><small>Cadastrados</small></div>
            </article>
            <article className={styles.summaryCard}>
              <span className={`${styles.summaryIcon} ${styles.iconPurple}`}><FiKey /></span>
              <div><p>Administradores</p><strong>{summary.admins}</strong><small>Acesso privilegiado</small></div>
            </article>
            <article className={styles.summaryCard}>
              <span className={`${styles.summaryIcon} ${styles.iconGreen}`}><FiUserCheck /></span>
              <div><p>Usuários Ativos</p><strong>{summary.active}</strong><small>Com acesso liberado</small></div>
            </article>
            <article className={styles.summaryCard}>
              <span className={`${styles.summaryIcon} ${styles.iconRed}`}><FiUserX /></span>
              <div><p>Usuários Inativos</p><strong>{summary.inactive}</strong><small>Sem acesso</small></div>
            </article>
          </section>

          {showForm && (
            <section className={styles.detailPanel} aria-label={editingId ? 'Editar usuário' : 'Novo usuário'}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                  <p className={styles.cardSubtitle}>
                    {editingId ? 'Altere os dados do usuário selecionado' : 'Preencha os dados para cadastrar um novo usuário'}
                  </p>
                </div>
                <button className={styles.closeBtn} type="button" onClick={() => { setShowForm(false); resetForm(); }}><FiX /></button>
              </div>
              <div className={styles.detailTabs} aria-label="Seções do usuário">
                <span className={styles.detailTabActive}><FiUser /> Dados pessoais</span>
                <span><FiShield /> Permissões</span>
                <span><FiActivity /> Histórico de acesso</span>
                <span><FiClipboard /> Auditoria</span>
              </div>
              <form className={styles.form} onSubmit={saveUser}>
                <div className={styles.formGroup}>
                  <label>Tipo de Usuário <span className={styles.required}>*</span></label>
                  <select name="tipo" className={`${styles.formControl} ${errors.tipo ? styles.error : ''}`} value={form.tipo} onChange={handleChange}>
                    <option value="">Selecione o tipo</option>
                    <option value="Cliente">Cliente</option>
                    <option value="Funcionário">Funcionário</option>
                    <option value="Admin">Admin</option>
                  </select>
                  {errors.tipo && <span className={styles.errorText}>{errors.tipo}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>Nome Completo <span className={styles.required}>*</span></label>
                  <input type="text" name="nome" className={`${styles.formControl} ${errors.nome ? styles.error : ''}`} placeholder="Digite o nome completo" value={form.nome} onChange={handleChange} />
                  {errors.nome && <span className={styles.errorText}>{errors.nome}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>E-mail <span className={styles.required}>*</span></label>
                  <input type="email" name="email" className={`${styles.formControl} ${errors.email ? styles.error : ''}`} placeholder="email@exemplo.com" value={form.email} onChange={handleChange} />
                  {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>Telefone <span className={styles.required}>*</span></label>
                  <input type="text" name="telefone" className={`${styles.formControl} ${errors.telefone ? styles.error : ''}`} placeholder="(00) 00000-0000" maxLength={15} value={form.telefone} onChange={handlePhoneChange} />
                  {errors.telefone && <span className={styles.errorText}>{errors.telefone}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>CPF <span className={styles.required}>*</span></label>
                  <input type="text" name="cpf" className={`${styles.formControl} ${errors.cpf ? styles.error : ''}`} placeholder="000.000.000-00" maxLength={14} value={form.cpf} onChange={handleCpfChange} />
                  {errors.cpf && <span className={styles.errorText}>{errors.cpf}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>Senha {!editingId && <span className={styles.required}>*</span>}</label>
                  <input type="password" name="senha" className={`${styles.formControl} ${errors.senha ? styles.error : ''}`} placeholder={editingId ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'} value={form.senha} onChange={handleChange} />
                  {errors.senha && <span className={styles.errorText}>{errors.senha}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>Confirmar Senha {!editingId && <span className={styles.required}>*</span>}</label>
                  <input type="password" name="confirmarSenha" className={`${styles.formControl} ${errors.confirmarSenha ? styles.error : ''}`} placeholder="Repita a senha" value={form.confirmarSenha} onChange={handleChange} />
                  {errors.confirmarSenha && <span className={styles.errorText}>{errors.confirmarSenha}</span>}
                </div>
                <div className={styles.formActions}>
                  <button type="submit" className={`${styles.btn} ${styles.btnBlue}`} disabled={saving}>
                    {saving ? <FiLoader className={styles.spinner} /> : <FiCheck />}
                    {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnLight}`} onClick={() => { setShowForm(false); resetForm(); }}><FiX /> Cancelar</button>
                  <button type="button" className={`${styles.btn} ${styles.btnLight}`} onClick={resetForm}>Limpar</button>
                </div>
              </form>
            </section>
          )}

          <section className={styles.usersPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Todos os Usuários</h2>
                <p>Visualize e gerencie acessos cadastrados no sistema</p>
              </div>
              <span className={styles.results}>{filteredUsers.length} usuário{filteredUsers.length !== 1 && 's'}</span>
            </div>
            <div className={styles.toolbar}>
              <label className={styles.searchField}>
                <FiSearch />
                <input type="text" placeholder="Buscar usuário por nome, e-mail ou CPF..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </label>
              <label className={styles.selectField}>
                <FiBriefcase />
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                  <option value="">Cargo</option>
                  <option value="admin">Administrador</option>
                  <option value="funcionario">Funcionário</option>
                  <option value="cliente">Cliente</option>
                </select>
              </label>
              <label className={`${styles.selectField} ${styles.unavailable}`} title="Filtro preparado para expansão futura">
                <FiSliders />
                <select disabled><option>Status</option></select>
              </label>
              <label className={`${styles.selectField} ${styles.unavailable}`} title="Ordenação preparada para expansão futura">
                <FiChevronDown />
                <select disabled><option>Ordenar</option></select>
              </label>
            </div>

            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Cargo</th>
                    <th>Status</th>
                    <th>Telefone / CPF</th>
                    <th>Último acesso</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6}><div className={styles.tableEmpty}><FiLoader className={styles.spinner} /><p>Carregando...</p></div></td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className={styles.tableEmpty}>
                          <FiUsers />
                          <p>{users.length === 0 ? 'Nenhum usuário cadastrado ainda.' : 'Nenhum resultado encontrado.'}</p>
                          <small>{users.length === 0 ? 'Clique em "Novo Usuário" para começar.' : 'Tente ajustar o termo de busca.'}</small>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.map((u) => (
                    <tr key={u.id} className={u.ativo === false ? styles.inactiveRow : undefined}>
                      <td data-label="Usuário">
                        <div className={styles.userIdentity}>
                          <span className={styles.avatar}>{getInitials(u.nome)}</span>
                          <div><strong>{u.nome}</strong><span>{u.email}</span></div>
                        </div>
                      </td>
                      <td data-label="Cargo">
                        <span className={`${styles.roleBadge} ${styles[`role_${u.tipo_usuario}`]}`}>{tipoDisplay(u.tipo_usuario)}</span>
                      </td>
                      <td data-label="Status">
                        <span className={`${styles.statusBadge} ${u.ativo === false ? styles.statusInactive : styles.statusActive}`}>
                          <i /> {u.ativo === false ? 'Inativo' : 'Ativo'}
                        </span>
                      </td>
                      <td data-label="Telefone / CPF">
                        <div className={styles.contact}><span>{u.telefone || '—'}</span><small>{u.cpf || '—'}</small></div>
                      </td>
                      <td data-label="Último acesso">
                        <div className={styles.access}><FiClock /> <span>{formatLastAccess(u.ultimo_login_em)}<small>Cadastro: {formatDate(u.created_at)}</small></span></div>
                      </td>
                      <td data-label="Ações">
                        <div className={styles.actionMenu} data-user-action-menu>
                          <button className={styles.moreButton} type="button" aria-label={`Ações para ${u.nome}`} onClick={() => setOpenActionUserId(current => current === u.id ? null : u.id)}>
                            <FiMoreVertical />
                          </button>
                          {openActionUserId === u.id && (
                            <div className={styles.actionDropdown}>
                              <button type="button" disabled={u.ativo === false} onClick={() => { editUser(u.id); setOpenActionUserId(null); }}><FiEdit2 /> Editar usuário</button>
                              <button type="button" disabled={u.ativo === false} onClick={() => { editUser(u.id); setOpenActionUserId(null); }}><FiLock /> Alterar senha</button>
                              <button type="button" disabled={u.ativo === false} onClick={() => { editUser(u.id); setOpenActionUserId(null); }}><FiBriefcase /> Alterar cargo</button>
                              <hr />
                              <button type="button" className={styles.dangerAction} disabled={u.ativo === false} onClick={() => { askDelete(u); setOpenActionUserId(null); }}><FiTrash2 /> Desativar</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className={styles.tableFooter}>
              <span>Total: {filteredUsers.length} usuário{filteredUsers.length !== 1 && 's'}</span>
              {(searchQuery || typeFilter) && filteredUsers.length !== users.length && <span>Filtrado de {users.length} usuários</span>}
            </footer>
          </section>
        </main>
      </div>

      {/* Delete Modal */}
      {deleteModal.open && (
        <div className={styles.modalOverlay} onClick={cancelDelete}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div className={styles.modalIcon}>
              <FiAlertCircle />
            </div>
            <h3>Desativar Usuário</h3>
            <p>
              Tem certeza que deseja desativar o usuário<br />
              <strong>{deleteModal.userName}</strong>?
            </p>
            <div className={styles.modalActions}>
              <button className={`${styles.btn} ${styles.btnLight}`} onClick={cancelDelete}>
                Cancelar
              </button>
              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={confirmDelete}>
                <FiTrash2 /> Sim, desativar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className={styles.toastContainer}>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`${styles.toast} ${
              t.type === 'success'
                ? styles.toastSuccess
                : t.type === 'error'
                ? styles.toastError
                : styles.toastInfo
            }`}
          >
            <span className={styles.toastIcon}>
              {t.type === 'success' ? <FiCheck /> : <FiX />}
            </span>
            <span className={styles.toastMsg}>{t.message}</span>
            <button className={styles.toastClose} onClick={() => removeToast(t.id)}>
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default crudApp;
