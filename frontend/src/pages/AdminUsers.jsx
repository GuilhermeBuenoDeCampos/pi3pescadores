import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FiUser,
  FiUserPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiUsers,
  FiLoader,
  FiArrowLeft,
  FiLogOut,
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

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        {/* Header */}
        <header className={styles.header}>
          <img src={logo} alt="Tres Pescadores Store Logo" className={styles.logo} />
          <div className={styles.titleContainer}>
            <h1>Tres Pescadores Store</h1>
            <div className={styles.subtitle}>Gerenciar Usuários</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
              <FiUser size={14} />
              {getAuthUser()?.nome || 'Usuário'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <a href="/admin" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                color: '#5366aa', background: '#f0f2f8', textDecoration: 'none', cursor: 'pointer',
              }}>
                <FiArrowLeft size={14} />
                Voltar
              </a>
              <button
                onClick={() => { clearAuthSession(); navigate('/login'); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  color: '#b91c1c', background: '#fef2f2', border: 'none', cursor: 'pointer',
                }}
              >
                <FiLogOut size={14} />
                Sair
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className={styles.content}>

          {/* Actions Bar */}
          <div className={styles.actionsBar}>
            <span className={styles.actionsLabel}>⚡ Ações Rápidas:</span>
            <button className={`${styles.btn} ${styles.btnBlue}`} onClick={openNewForm}>
              <FiUserPlus /> Novo Usuário
            </button>
          </div>

          {/* Info Box */}
          <div className={styles.infoBox}>
            <span style={{fontSize: '18px'}}>ℹ️</span> Dica: Organize os usuários por tipo (Admin, Funcionário, Cliente) para facilitar o gerenciamento de permissões.
          </div>

          {/* Form Card */}
          {showForm && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>
                    {editingId ? 'Editar Usuário' : 'Novo Usuário'}
                  </h2>
                  <p className={styles.cardSubtitle}>
                    {editingId
                      ? 'Altere os dados do usuário selecionado'
                      : 'Preencha os dados para cadastrar um novo usuário'}
                  </p>
                </div>
                <button
                  className={styles.closeBtn}
                  onClick={() => { setShowForm(false); resetForm(); }}
                >
                  &times;
                </button>
              </div>

              <form className={styles.form} onSubmit={saveUser}>
                <div className={styles.formGroup}>
                  <label>
                    Tipo de Usuário <span className={styles.required}>*</span>
                  </label>
                  <select
                    name="tipo"
                    className={`${styles.formControl} ${errors.tipo ? styles.error : ''}`}
                    value={form.tipo}
                    onChange={handleChange}
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="Cliente">Cliente</option>
                    <option value="Funcionário">Funcionário</option>
                    <option value="Admin">Admin</option>
                  </select>
                  {errors.tipo && <span className={styles.errorText}>{errors.tipo}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label>
                    Nome Completo <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="nome"
                    className={`${styles.formControl} ${errors.nome ? styles.error : ''}`}
                    placeholder="Digite o nome completo"
                    value={form.nome}
                    onChange={handleChange}
                  />
                  {errors.nome && <span className={styles.errorText}>{errors.nome}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label>
                    E-mail <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    className={`${styles.formControl} ${errors.email ? styles.error : ''}`}
                    placeholder="email@exemplo.com"
                    value={form.email}
                    onChange={handleChange}
                  />
                  {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label>
                    Telefone <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="telefone"
                    className={`${styles.formControl} ${errors.telefone ? styles.error : ''}`}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    value={form.telefone}
                    onChange={handlePhoneChange}
                  />
                  {errors.telefone && <span className={styles.errorText}>{errors.telefone}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label>
                    CPF <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="cpf"
                    className={`${styles.formControl} ${errors.cpf ? styles.error : ''}`}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    value={form.cpf}
                    onChange={handleCpfChange}
                  />
                  {errors.cpf && <span className={styles.errorText}>{errors.cpf}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label>
                    Senha {!editingId && <span className={styles.required}>*</span>}
                  </label>
                  <input
                    type="password"
                    name="senha"
                    className={`${styles.formControl} ${errors.senha ? styles.error : ''}`}
                    placeholder={editingId ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}
                    value={form.senha}
                    onChange={handleChange}
                  />
                  {errors.senha && <span className={styles.errorText}>{errors.senha}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label>
                    Confirmar Senha {!editingId && <span className={styles.required}>*</span>}
                  </label>
                  <input
                    type="password"
                    name="confirmarSenha"
                    className={`${styles.formControl} ${errors.confirmarSenha ? styles.error : ''}`}
                    placeholder="Repita a senha"
                    value={form.confirmarSenha}
                    onChange={handleChange}
                  />
                  {errors.confirmarSenha && <span className={styles.errorText}>{errors.confirmarSenha}</span>}
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={`${styles.btn} ${styles.btnBlue}`} disabled={saving}>
                    {saving ? <FiLoader className="animate-spin" /> : <FiCheck />}
                    {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnLight}`}
                    onClick={() => { setShowForm(false); resetForm(); }}
                  >
                    <FiX /> Cancelar
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnLight}`}
                    onClick={resetForm}
                  >
                    Limpar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search Bar */}
          <div className={styles.searchBar}>
            <div>
              <h3>Usuários Cadastrados</h3>
              <p className={styles.hint}>Visualize e gerencie todos os usuários do sistema</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Buscar por nome, email, CPF..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <select
                className={styles.searchInput}
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                style={{ width: 160 }}
              >
                <option value="">Todos os tipos</option>
                <option value="admin">Admin</option>
                <option value="funcionario">Funcionário</option>
                <option value="cliente">Cliente</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableWrap}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Nome</th>
                    <th className={styles.hideTablet}>E-mail</th>
                    <th className={styles.hideMobile}>Telefone</th>
                    <th className={styles.hideDesktop}>CPF</th>
                    <th className={styles.hideDesktop}>Cadastro</th>
                    <th style={{ textAlign: 'center', width: 100 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7}>
                        <div className={styles.tableEmpty}>
                          <FiLoader />
                          <p>Carregando...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className={styles.tableEmpty}>
                          <FiUsers />
                          <p>
                            {users.length === 0
                              ? 'Nenhum usuário cadastrado ainda.'
                              : 'Nenhum resultado encontrado.'}
                          </p>
                          <small>
                            {users.length === 0
                              ? 'Clique em "Novo Usuário" para começar.'
                              : 'Tente ajustar o termo de busca.'}
                          </small>
                        </div>
                      </td>
                    </tr>
                  ) : (
                      filteredUsers.map((u) => {
                      const displayTipo = tipoDisplay(u.tipo_usuario);
                      return (
                      <tr key={u.id} style={u.ativo === false ? { opacity: 0.55 } : undefined}>
                        <td>
                          <span
                            className={styles.badge}
                            style={{
                              background:
                                u.tipo_usuario === 'admin'
                                  ? '#eef2ff'
                                  : u.tipo_usuario === 'funcionario'
                                  ? '#f0fdf4'
                                  : '#fefce8',
                              color:
                                u.tipo_usuario === 'admin'
                                  ? '#4338ca'
                                  : u.tipo_usuario === 'funcionario'
                                  ? '#15803d'
                                  : '#a16207',
                            }}
                          >
                            {displayTipo}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500, color: '#1e293b' }}>
                          {u.nome}
                          {u.ativo === false && (
                            <span className={styles.badge} style={{ marginLeft: 8, background: '#f1f5f9', color: '#64748b', fontSize: '0.72rem' }}>
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className={styles.hideTablet} style={{ color: '#475569' }}>
                          {u.email}
                        </td>
                        <td className={styles.hideMobile} style={{ color: '#475569' }}>
                          {u.telefone || '—'}
                        </td>
                        <td
                          className={styles.hideDesktop}
                          style={{ fontFamily: 'monospace', fontSize: 13, color: '#64748b' }}
                        >
                          {u.cpf}
                        </td>
                        <td className={styles.hideDesktop} style={{ fontSize: 13, color: '#64748b' }}>
                          {formatDate(u.created_at)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            <button
                              className={`${styles.actionBtn} ${styles.actionBtnEdit}`}
                              title={u.ativo === false ? 'Usuário inativo' : 'Editar'}
                              disabled={u.ativo === false}
                              onClick={() => editUser(u.id)}
                              style={u.ativo === false ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                              title={u.ativo === false ? 'Usuário inativo' : 'Desativar'}
                              disabled={u.ativo === false}
                              onClick={() => askDelete(u)}
                              style={u.ativo === false ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className={styles.tableFooter}>
              <span>
                Total: {filteredUsers.length} usuário{filteredUsers.length !== 1 && 's'}
              </span>
              {searchQuery && filteredUsers.length !== users.length && (
                <span style={{ color: '#94a3b8' }}>
                  (filtrado de {users.length})
                </span>
              )}
            </div>
          </div>
        </div>
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
