import { useState, useEffect } from 'react';
import {
  BACKEND_URL,
  clearAuthSession,
  fetchCategories,
  fetchProducts,
  fetchProductById,
  fetchTodosPedidos,
  getAuthHeaders,
  getAuthUser,
  getImageUrl,
  updateProductStatus,
} from '../services/api';
import { FiArrowLeft, FiLogOut, FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo/logo.png';
import AuditoriaModal from '../components/AuditoriaModal';
import styles from './StockManagement.module.css';

const StockManagement = () => {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null);
  const [isAuditoriaOpen, setIsAuditoriaOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [productFilter, setProductFilter] = useState('');
  const [editProduct, setEditProduct] = useState(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  // Single launch
  const [searchTerm, setSearchTerm] = useState('');
  const [launchQuantity, setLaunchQuantity] = useState(0);
  const [singleSuggestions, setSingleSuggestions] = useState([]);
  const [singleSelectedProduct, setSingleSelectedProduct] = useState(null);
  const [singleActiveIndex, setSingleActiveIndex] = useState(-1);
  // Mass launch
  const [massItems, setMassItems] = useState([]); // { id_produto, quantidade }
  // Settings
  const [autoDisableZeroStock, setAutoDisableZeroStock] = useState(() => {
    try {
      const saved = localStorage.getItem('autoDisableZeroStock');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const loadData = async () => {
    try {
      const dataCat = await fetchCategories();
      setCategories(Array.isArray(dataCat) ? dataCat : dataCat.data || []);
      
      const dataProd = await fetchProducts();
      setProducts(dataProd);
      const total = dataProd.reduce((acc, p) => acc + (p.estoque_atual || 0), 0);
      setTotalItems(total);
    } catch (err) {
      console.error("Failed to load data", err);
    }
  };

  const loadPendingOrdersCount = async () => {
    try {
      const result = await fetchTodosPedidos({ status: 'pendente', limit: 1 });
      setPendingOrdersCount(result.pagination?.total || 0);
    } catch (err) {
      console.error("Failed to load pending orders count", err);
    }
  };

  useEffect(() => {
    loadData();
    loadPendingOrdersCount();
  }, []);

  // Auto-desativar produtos com estoque zero
  useEffect(() => {
    const autoDisableProducts = async () => {
      if (!autoDisableZeroStock || !Array.isArray(products)) return;

      for (const product of products) {
        // Se o produto tem estoque zero e está ativo, desativar
        if (product.estoque_atual === 0 && product.ativo !== false) {
          try {
            await updateProductStatus(product.id, false);
          } catch (err) {
            console.error(`Erro ao desativar produto ${product.id}:`, err);
          }
        }
      }
    };

    autoDisableProducts();
  }, [autoDisableZeroStock, products]);

  const closeModal = () => {
    setActiveModal(null);
    setSelectedImages([]); // Limpa as imagens ao fechar
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files) => {
    const newImages = files
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
    setSelectedImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index) => {
    setSelectedImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Acrescentar as imagens arrastadas/adicionadas
    // O backend multer recebe o arquivo no campo 'imagens'
    formData.delete('imagens'); // Remove caso já exista algo no form nativamente
    selectedImages
      .filter((img) => img.file instanceof File)
      .forEach((img) => {
        formData.append('imagens', img.file);
      });

    try {
      const headers = { ...getAuthHeaders() };
      let response;
      if (editProduct && editProduct.id) {
        // use POST to update when sending multipart FormData from the browser
        response = await fetch(`${BACKEND_URL}/api/produtos/${editProduct.id}`, {
          method: 'POST',
          headers,
          body: formData,
        });
      } else {
        response = await fetch(`${BACKEND_URL}/api/produtos`, {
          method: 'POST',
          headers,
          body: formData,
        });
      }

      if (!response.ok) {
        let serverMsg = 'Falha ao salvar produto';
        try {
          const body = await response.json();
          if (body && body.error && body.error.message) serverMsg = body.error.message;
          else if (body && body.message) serverMsg = body.message;
        } catch (e) {
          // ignore JSON parse error
        }
        throw new Error(serverMsg);
      }

      alert('Produto salvo com sucesso!');
      setEditProduct(null);
      closeModal();
      loadData(); // Recarrega a listagem de produtos
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar produto! ' + (err.message || ''));
    }
  };

  const [newCategoryName, setNewCategoryName] = useState('');
  
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/categorias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ nome: newCategoryName })
      });

      if (!response.ok) throw new Error('Falha ao criar categoria');

      alert('Categoria salva com sucesso!');
      setNewCategoryName('');
      loadData(); // Recarrega listagem de categorias
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar categoria!');
    }
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    if (!value) {
      setSingleSuggestions([]);
      return;
    }
    const q = value.toLowerCase();
    const suggestions = products
      .filter(p => p.nome && p.nome.toLowerCase().includes(q))
      .slice(0, 8)
      .map(p => ({ id: p.id, nome: p.nome }));
    setSingleSuggestions(suggestions);
  };

  const selectSingleSuggestion = (product) => {
    setSingleSelectedProduct(product);
    setSearchTerm(product.nome);
    setSingleSuggestions([]);
    setSingleActiveIndex(-1);
  };

  const handleSingleKeyDown = (e) => {
    if (!singleSuggestions || singleSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSingleActiveIndex((i) => Math.min(i + 1, singleSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSingleActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = singleSuggestions[singleActiveIndex >= 0 ? singleActiveIndex : 0];
      if (sel) selectSingleSuggestion(sel);
    } else if (e.key === 'Escape') {
      setSingleSuggestions([]);
      setSingleActiveIndex(-1);
    }
  };

  // Mass launch handlers
  const addMassItem = (productObj, quantidade) => {
    if (!productObj || !productObj.id) return;
    const pid = Number(productObj.id);
    const q = Number(quantidade);
    if (!Number.isInteger(pid) || pid <= 0 || !Number.isInteger(q) || q <= 0) return;
    // prevent duplicate SKU entries
    setMassItems(prev => {
      if (prev.some(item => Number(item.id_produto) === pid)) {
        return prev.map(item => item.id_produto === pid ? { ...item, quantidade: Number(item.quantidade) + q } : item);
      }
      return [...prev, { id_produto: pid, quantidade: q, nome: productObj.nome }];
    });
    // reset inputs
    setSearchTerm('');
    setSingleSuggestions([]);
    setSingleSelectedProduct(null);
    setLaunchQuantity('');
  };

  const handleToggleActive = async (productId, currentStatus) => {
    try {
      await updateProductStatus(productId, !currentStatus);
      loadData();
    } catch (err) {
      console.error('Erro ao atualizar status do produto:', err);
      alert('Erro ao atualizar status: ' + (err.message || ''));
    }
  };

  const handleToggleAutoDisableZeroStock = () => {
    const newValue = !autoDisableZeroStock;
    setAutoDisableZeroStock(newValue);
    try {
      localStorage.setItem('autoDisableZeroStock', JSON.stringify(newValue));
    } catch (err) {
      console.error('Erro ao salvar configuração local:', err);
    }
  };

  const handleMassLaunch = async (e) => {
    e.preventDefault();
    if (!massItems.length) {
      alert('Adicione pelo menos um produto à lista.');
      return;
    }
    // Validate quantities: must be positive integers
    for (let i = 0; i < massItems.length; i++) {
      const q = massItems[i].quantidade;
      if (q === '' || q == null || !Number.isInteger(Number(q)) || Number(q) <= 0) {
        alert(`Quantidade inválida para o produto ${massItems[i].nome || massItems[i].id_produto}. Informe um número inteiro maior que zero.`);
        return;
      }
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/produtos/movimentacoes/massa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ movimentacoes: massItems.map(item => ({ id_produto: item.id_produto, tipo: 'entrada', quantidade: Number(item.quantidade), motivo: 'compra' })) }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err && err.error ? err.error.message : 'Falha no lançamento em massa');
      }

      alert('Lançamento em massa realizado com sucesso');
      setMassItems([]);
      closeModal();
      loadData();
    } catch (err) {
      console.error(err);
      alert('Erro no lançamento em massa: ' + err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        {/* Header */}
        <header className={styles.header}>
          <img src={logo} alt="Tres Pescadores Store Logo" className={styles.logo} />
          <div className={styles.titleContainer}>
            <h1>Tres Pescadores Store</h1>
            <div className={styles.subtitle}>Gerenciar Estoque</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
              <FiUser size={14} />
              {getAuthUser()?.nome || 'Usuário'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => navigate('/admin')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  color: '#5366aa', background: '#f0f2f8', border: 'none', cursor: 'pointer',
                }}
              >
                <FiArrowLeft size={14} />
                Voltar
              </button>
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
            <button className={`${styles.btn} ${styles.btnBlue}`} onClick={() => { setEditProduct(null); setSelectedImages([]); setActiveModal('novo-produto'); }}>+ Novo Produto</button>
            <button className={`${styles.btn} ${styles.btnLight}`} onClick={() => setActiveModal('categorias')}>📋 Categorias</button>
            {/* botão 'Lançar Produtos' removido */}
            <button className={`${styles.btn} ${styles.btnYellow}`} onClick={() => setActiveModal('lancamento-massa')}>&equiv; Lançar Produto</button>
            <button className={`${styles.btn} ${styles.btnGreen}`} onClick={() => setIsAuditoriaOpen(true)}>✓ Auditoria</button>
            <button className={`${styles.btn} ${styles.btnLight}`} onClick={() => navigate('/vendas')} style={{ position: 'relative' }}>
              📊 Vendas
              {pendingOrdersCount > 0 && (
                <span className={styles.badge}>{pendingOrdersCount}</span>
              )}
            </button>
            <button className={`${styles.btn} ${styles.btnLight}`} onClick={() => setActiveModal('configuracoes')}>⚙️ Configurações</button>
          </div>

          {/* Dashboards */}
          <div className={styles.dashboardCards}>
            <div className={`${styles.card} ${styles.card1}`}>
              <h3>Produtos</h3>
              <div className={styles.value}>{products.length} <span>cadastrados</span></div>
            </div>
            <div className={`${styles.card} ${styles.card2}`}>
              <h3>Quantidade</h3>
              <div className={styles.value}>{totalItems} <span>itens total</span></div>
            </div>
          </div>

          {/* Info Box */}
          <div className={styles.infoBox}>
            <span style={{fontSize: '18px'}}>ℹ️</span> Dica Prática: Organize seus produtos por estoques separados para facilitar o gerenciamento de diferentes centros de distribuição.
          </div>

          {/* Table Area */}
          <div className={styles.searchBar}>
            <div>
              <h3>Catálogo de Produtos</h3>
              <p className={styles.hint}>Visualize e gerencie todos os seus produtos</p>
            </div>
            <div>
              <input type="text" placeholder="Buscar por nome ou SKU..." className={styles.searchInput} value={productFilter} onChange={(e) => setProductFilter(e.target.value)} />
              <button className={`${styles.btn} ${styles.btnLight}`} style={{marginLeft: '12px'}}>Filtros</button>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th>Unidade</th>
                <th>Quantidade</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.filter(p => {
                if (!productFilter) return true;
                const q = productFilter.toString().toLowerCase();
                return (p.nome && p.nome.toLowerCase().includes(q)) || p.id.toString().includes(q);
              }).map(product => (
                <tr key={product.id} className={styles.tableBodyRow}>
                  <td>{product.nome}</td>
                  <td>{product.id}</td>
                  <td>un</td>
                  <td>{product.estoque_atual || 0}</td>
                  <td>
                    <label className={styles.toggleSwitch}>
                      <input 
                        type="checkbox" 
                        checked={product.ativo} 
                        onChange={() => handleToggleActive(product.id, product.ativo)}
                        className={styles.toggleCheckbox}
                      />
                      <span className={styles.toggleSlider}></span>
                    </label>
                  </td>
                  <td>
                    <button className={`${styles.btn} ${styles.btnLight}`} style={{padding:'4px 8px', fontSize:'12px'}} onClick={async () => {
                      // open modal in edit mode, fetch full product data (including images)
                      try {
                        const prod = await fetchProductById(product.id);
                        setEditProduct(prod);
                        // map imagens to selectedImages previews (no File objects)
                        const imgs = (prod.imagens || []).map(im => ({ file: null, preview: getImageUrl(im.url) }));
                        setSelectedImages(imgs);
                        setActiveModal('novo-produto');
                      } catch (err) {
                        console.error('Failed to fetch product for edit', err);
                        alert('Erro ao carregar produto para edição: ' + (err.message || ''));
                      }
                    }}>Editar</button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      
      {/* Novo Produto Modal */}
      {activeModal === 'novo-produto' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={`${styles.modalSidebar} ${styles.sidebarBlue}`}>
              <h3>Dicas Rápidas</h3>
              <ul>
                <li>Use um nome descritivo e fácil de encontrar.</li>
                <li>Defina preços de varejo e atacado para ofertas atraentes.</li>
                <li>Categorias ajudam seus clientes a encontrar produtos rapidamente.</li>
              </ul>
            </div>
            <div className={styles.modalBody}>
              <button className={styles.closeButton} onClick={closeModal}>&times;</button>
              <div className={styles.modalHeader}>
                <h2>Novo Produto</h2>
                <p>Preencha as informações e organize seu produto em poucos passos.</p>
              </div>
              <form onSubmit={handleCreateProduct}>
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#0f172a', marginBottom: '10px' }}>INFORMAÇÕES BÁSICAS</h4>
                  <div className={styles.formGroup}>
                    <label>Nome *</label>
                    <input type="text" name="nome" className={styles.formControl} placeholder="Ex.: Produto Exemplo" required defaultValue={editProduct ? editProduct.nome : ''} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Categoria(s) *</label>
                    <select name="id_categoria" multiple className={styles.formControl} required style={{ height: 'auto', minHeight: '100px' }} defaultValue={editProduct ? [String(editProduct.id_categoria)] : undefined}>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.nome}</option>
                      ))}
                    </select>
                    <span className={styles.hint}>Pressione Ctrl (ou Cmd) para selecionar mais de uma. (<i>Atualmente salva apenas na categoria principal no banco.</i>)</span>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Descrição</label>
                    <textarea name="descricao" className={styles.formControl} placeholder="Conte brevemente os principais diferenciais do produto"></textarea>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#0f172a', marginBottom: '10px' }}>PREÇO</h4>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Preço de Custo (R$) *</label>
                      <input type="number" step="0.01" name="preco_custo" className={styles.formControl} placeholder="0.00" required defaultValue={editProduct ? editProduct.preco_custo : ''} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Preço de Venda (R$) *</label>
                      <input type="number" step="0.01" name="preco_venda" className={styles.formControl} placeholder="0.00" required defaultValue={editProduct ? editProduct.preco_venda : ''} />
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#0f172a', marginBottom: '10px' }}>DIMENSÕES E PESO</h4>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Peso (kg)</label>
                      <input type="number" step="0.001" name="peso" className={styles.formControl} placeholder="0.000" defaultValue={editProduct && editProduct.peso !== undefined ? editProduct.peso : ''} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Altura (m)</label>
                      <input type="number" step="0.01" name="altura" className={styles.formControl} placeholder="0.00" defaultValue={editProduct && editProduct.altura !== undefined ? editProduct.altura : ''} />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Largura (m)</label>
                      <input type="number" step="0.01" name="largura" className={styles.formControl} placeholder="0.00" defaultValue={editProduct && editProduct.largura !== undefined ? editProduct.largura : ''} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Profundidade (m)</label>
                      <input type="number" step="0.01" name="profundidade" className={styles.formControl} placeholder="0.00" defaultValue={editProduct && editProduct.profundidade !== undefined ? editProduct.profundidade : ''} />
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#0f172a', marginBottom: '10px' }}>IMAGENS</h4>
                  <div className={styles.formGroup}>
                    <label>Upload de Imagens</label>
                    <div 
                      className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input 
                        type="file" 
                        name="imagens" 
                        multiple 
                        accept="image/*" 
                        className={styles.dropzoneInput} 
                        onChange={handleImageChange}
                        title="Arraste as imagens aqui ou clique para selecionar"
                      />
                      <div className={styles.dropzoneText}>
                        <strong>Arraste as imagens aqui</strong> ou clique para selecionar
                      </div>
                      <span className={styles.hint}>Suporta múltiplas imagens (JPG, PNG, etc).</span>
                    </div>

                    {/* Previews das Imagens */}
                    {selectedImages.length > 0 && (
                      <div className={styles.imagePreviewGallery}>
                        {selectedImages.map((img, idx) => (
                          <div key={idx} className={styles.imagePreviewItem}>
                            <img src={img.preview} alt={`Preview ${idx}`} />
                            <button 
                              type="button" 
                              className={styles.removeImageBtn} 
                              onClick={() => removeImage(idx)}
                              title="Remover imagem"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.modalFooter}>
                   <button type="button" className={`${styles.btn} ${styles.btnLight}`} onClick={closeModal}>Cancelar</button>
                   <button type="submit" className={`${styles.btn} ${styles.btnBlue}`}>Salvar Produto</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 'Lançar Produtos' modal removed */}

      {/* Lançamento em Massa Modal */}
      {activeModal === 'lancamento-massa' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={`${styles.modalSidebar} ${styles.sidebarOrange}`}>
              <h3>Boas práticas</h3>
              <ul>
                <li>Escolha um único estoque de destino para esta operação.</li>
                <li>Adicione produtos usando busca rápida.</li>
                <li>Revise o resumo antes de confirmar.</li>
              </ul>
            </div>
            <div className={styles.modalBody}>
              <button className={styles.closeButton} onClick={closeModal}>&times;</button>
              <div className={styles.modalHeader}>
                <h2>Lançamento em massa</h2>
                <p>Distribua diversas unidades em um único estoque de destino com rapidez.</p>
              </div>
              <form onSubmit={handleMassLaunch}>
                <div className={styles.formGroup}>
                    <label>Adicionar Produtos (Informe SKU e quantidade)</label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="text" value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} onKeyDown={handleSingleKeyDown} className={styles.formControl} placeholder="Digite para filtrar a lista abaixo" />
                        <input type="number" value={launchQuantity} onChange={(e) => setLaunchQuantity(e.target.value)} className={styles.formControl} placeholder="Quantidade" style={{ width: '140px' }} />
                        <button type="button" className={`${styles.btn} ${styles.btnBlue}`} onClick={() => { if (singleSelectedProduct) { /* quickly launch single product */ addMassItem(singleSelectedProduct, launchQuantity); setLaunchQuantity(''); } }}>Adicionar (rápido)</button>
                      </div>
                      {singleSuggestions.length > 0 && (
                        <div style={{ position: 'absolute', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', zIndex: 50, maxHeight: '220px', overflowY: 'auto' }}>
                          {singleSuggestions.map((s, idx) => (
                            <div key={s.id} style={{ padding: '8px 12px', cursor: 'pointer', background: idx === singleActiveIndex ? '#f1f5f9' : 'white' }} onClick={() => selectSingleSuggestion(s)}>
                              {s.nome} <small style={{ color: '#64748b', marginLeft: 8 }}>#{s.id}</small>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  {massItems.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <table className={styles.table} style={{ margin: 0 }}>
                        <thead>
                          <tr><th>SKU</th><th>Quantidade</th><th></th></tr>
                        </thead>
                        <tbody>
                          {massItems.map((it, idx) => (
                            <tr key={idx} className={styles.tableBodyRow}>
                              <td>{it.id_produto} <div style={{ color: '#64748b' }}>{it.nome}</div></td>
                              <td>
                                <input
                                  type="number"
                                  min="1"
                                  value={it.quantidade}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setMassItems(prev => prev.map((item, i) => i === idx ? { ...item, quantidade: v === '' ? '' : Number(v) } : item));
                                  }}
                                  className={styles.formControl}
                                  style={{ width: '140px' }}
                                />
                              </td>
                              <td>
                                <button type="button" className={`${styles.btn} ${styles.btnLight}`} onClick={() => setMassItems(prev => prev.filter((_, i) => i !== idx))}>Remover</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className={styles.modalFooter}>
                   <button type="button" className={`${styles.btn} ${styles.btnLight}`} onClick={closeModal}>Cancelar</button>
                   <button type="submit" className={`${styles.btn} ${styles.btnOrange}`}>Lançar em massa</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Transferência Modal */}
      {activeModal === 'transferencia' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={`${styles.modalSidebar} ${styles.sidebarBlue}`}>
              <h3>Recomendações</h3>
              <ul>
                <li>Selecione estoques origem e destino antes de pesquisar produtos.</li>
                <li>As transferências são atômicas.</li>
                <li>Revise o resumo para evitar mover itens incorretos.</li>
              </ul>
            </div>
            <div className={styles.modalBody}>
              <button className={styles.closeButton} onClick={closeModal}>&times;</button>
              <div className={styles.modalHeader}>
                <h2>Transferência em massa</h2>
                <p>Mova diversos produtos entre estoques diferentes em uma única operação.</p>
              </div>
              <form>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Estoque origem *</label>
                    <select className={styles.formControl}>
                      <option>-- Selecione o estoque origem --</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Estoque destino *</label>
                    <select className={styles.formControl}>
                      <option>-- Selecione o estoque destino --</option>
                    </select>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Adicionar Produtos</label>
                  <input type="text" className={styles.formControl} placeholder="Selecione primeiro o estoque origem..." />
                </div>
                <div className={styles.modalFooter}>
                   <button type="button" className={`${styles.btn} ${styles.btnLight}`} onClick={closeModal}>Cancelar</button>
                   <button type="button" className={`${styles.btn} ${styles.btnBlue}`}>Transferir em massa</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Novo Estoque Modal */}
      {activeModal === 'novo-estoque' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={`${styles.modalSidebar} ${styles.sidebarGreenLight}`}>
              <h3>Orientações</h3>
              <ul>
                <li>Cadastre estoques próximos aos seus centros de distribuição.</li>
                <li>Utilize endereços existentes para agilizar.</li>
                <li>Defina a disponibilidade.</li>
              </ul>
            </div>
            <div className={styles.modalBody}>
              <button className={styles.closeButton} onClick={closeModal}>&times;</button>
              <div className={styles.modalHeader}>
                <h2>Novo estoque</h2>
                <p>Cadastre um novo local de armazenamento para organizar seus produtos.</p>
              </div>
              <form>
                <div className={styles.formGroup}>
                  <label>Nome do estoque *</label>
                  <input type="text" className={styles.formControl} />
                </div>
                <div className={styles.formGroup}>
                  <label>Descrição</label>
                  <textarea className={styles.formControl} placeholder="Descreva a finalidade deste estoque"></textarea>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>CEP *</label>
                    <input type="text" className={styles.formControl} placeholder="00000-000" />
                  </div>
                  <div className={styles.formGroup}>
                    <label>UF *</label>
                    <input type="text" className={styles.formControl} />
                  </div>
                </div>
                <div className={styles.modalFooter}>
                   <button type="button" className={`${styles.btn} ${styles.btnLight}`} onClick={closeModal}>Cancelar</button>
                   <button type="button" className={`${styles.btn} ${styles.btnGreenLight}`}>Salvar estoque</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Categorias Modal */}
      {activeModal === 'categorias' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={`${styles.modalSidebar} ${styles.sidebarBlue}`}>
              <h3>Gestão de Categorias</h3>
              <ul>
                <li>Crie categorias claras para facilitar a navegação.</li>
                <li>Pense em como seus clientes encontram os produtos.</li>
                <li>Categorias bem definidas ajudam no controle de estoque.</li>
              </ul>
            </div>
            <div className={styles.modalBody}>
              <button className={styles.closeButton} onClick={closeModal}>&times;</button>
              <div className={styles.modalHeader}>
                <h2>Gerenciar Categorias</h2>
                <p>Visualize e adicione novas categorias aos seus produtos.</p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', marginBottom: '10px' }}>NOVA CATEGORIA</h4>
                <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  <div className={styles.formGroup} style={{ marginBottom: 0, flex: 1 }}>
                    <label>Nome da Categoria *</label>
                    <input 
                      type="text" 
                      className={styles.formControl} 
                      placeholder="Ex.: Imagens, Cestas, Terços..." 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className={`${styles.btn} ${styles.btnBlue}`} style={{ height: '42px', padding: '0 20px' }}>Adicionar</button>
                </form>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', marginBottom: '10px' }}>CATEGORIAS CADASTRADAS</h4>
                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e1e7ec', borderRadius: '8px' }}>
                  <table className={styles.table} style={{ margin: 0 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8fafc' }}>
                      <tr>
                        <th style={{ width: '80px' }}>ID</th>
                        <th>Nome da Categoria</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map(cat => (
                        <tr key={cat.id} className={styles.tableBodyRow}>
                          <td style={{ color: '#64748b' }}>#{cat.id}</td>
                          <td>{cat.nome}</td>
                        </tr>
                      ))}
                      {categories.length === 0 && (
                        <tr>
                          <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Nenhuma categoria cadastrada.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnLight}`} onClick={closeModal}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configurações Modal */}
      {activeModal === 'configuracoes' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={`${styles.modalSidebar} ${styles.sidebarBlue}`}>
              <h3>Configurações</h3>
              <ul>
                <li>Customize as preferências do seu gerenciador de estoque.</li>
                <li>Ative automações para ganhar tempo.</li>
                <li>Mantenha seu inventário organizado e eficiente.</li>
              </ul>
            </div>
            <div className={styles.modalBody}>
              <button className={styles.closeButton} onClick={closeModal}>&times;</button>
              <div className={styles.modalHeader}>
                <h2>Configurações do Sistema</h2>
                <p>Personalize o comportamento do seu gerenciador de estoque.</p>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ color: '#0f172a', marginBottom: '15px' }}>AUTOMAÇÕES</h4>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '15px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e1e7ec'
                }}>
                  <div>
                    <label style={{ color: '#0f172a', fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
                      Auto-desativar com Estoque Zero
                    </label>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                      Desativa automaticamente produtos quando o estoque chega a zero.
                    </p>
                  </div>
                  <div className={styles.toggleSwitch} onClick={handleToggleAutoDisableZeroStock}>
                    <input 
                      type="checkbox" 
                      className={styles.toggleCheckbox}
                      checked={autoDisableZeroStock}
                      readOnly
                    />
                    <span className={styles.toggleSlider}></span>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnLight}`} onClick={closeModal}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auditoria Modal */}
      <AuditoriaModal 
        isOpen={isAuditoriaOpen} 
        onClose={() => setIsAuditoriaOpen(false)}
      />

      </div>
    </div>
  );
};

export default StockManagement;
