import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchProductById, fetchProductByName, fetchProducts, getImageUrl } from '../services/api';
import { registrarEventoVisitante } from '../services/visitanteEvento';

import Header from '../components/Header';
import ProductDetailsCard from '../components/ProductDetailsCard';
import RelatedProducts from '../components/RelatedProducts';
import Footer from '../components/Footer';
import styles from './ProductPage.module.css';
import semImagem from '../assets/ProdutoSemImagem/semimagem.png';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/productUtils';

function ProductPage() {
  const cartContext = useCart();
  const { addToCart = () => {} } = cartContext || {};
  const navigate = useNavigate();
  const [justAdded, setJustAdded] = useState(false);
  const { id, nome } = useParams();
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [activeImage, setActiveImage] = useState('');
  const [mainImgSrc, setMainImgSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const productViewRegistered = useRef(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        let productData;

        if (nome) {
          // Load by product name (slug)
          productData = await fetchProductByName(nome);
        } else {
          // Load by product ID
          productData = await fetchProductById(id);
        }

        if (!productData) {
          throw new Error('Produto não encontrado');
        }

        setProduct(productData);
        setActiveImage(productData.imagens?.[0]?.url ? getImageUrl(productData.imagens[0].url) : semImagem);
        setMainImgSrc(productData.imagens?.[0]?.url ? getImageUrl(productData.imagens[0].url) : semImagem);
        
        // Registrar evento de visualização de produto (apenas uma vez)
        if (!productViewRegistered.current) {
          productViewRegistered.current = true;
          registrarEventoVisitante('visualizou_produto');
        }
      } catch (err) {
        console.error('Erro ao carregar produto:', err);
        setError(err?.message || 'Falha ao carregar o produto');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, nome]);

  useEffect(() => {
    const loadAllProducts = async () => {
      try {
        const productsData = await fetchProducts();
        setAllProducts(productsData);
      } catch (err) {
        console.error('Erro ao carregar produtos relacionados:', err);
      }
    };

    loadAllProducts();
  }, []);

  useEffect(() => {
    setMainImgSrc(activeImage);
  }, [activeImage]);

  useEffect(() => {
    if (product) {
      document.title = `${product.nome} | Tres Pescadores`;
    }
  }, [product]);

  const productPrice = formatPrice(product?.preco_venda);
  const isOutOfStock = Number(product?.estoque_atual) <= 0;

  const handleAddToCart = (shouldNavigate = false) => {
    if (isOutOfStock) {
      return;
    }

    if (!cartContext) {
      console.error('CartContext indisponivel no ProductPage');
      return;
    }

    void addToCart(product).then(() => {
      // Registrar evento de adição ao carrinho
      registrarEventoVisitante('adicionou_produto_no_carrinho');
      
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1800);

      if (shouldNavigate) {
        navigate('/carrinho');
      }
    }).catch((error) => {
      console.error('Erro ao adicionar produto ao carrinho:', error);
    });
  };

  if (loading) {
    return (
      <div className={styles.notFound}>
        <Header />
        <main className={styles.productMain}>
          <p>Carregando produto...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={styles.notFound}>
        <Header />
        <main className={styles.productMain}>
          <p>{error ? `Erro: ${error}` : 'Produto não encontrado.'}</p>
          <Link to="/">Voltar ao início</Link>
        </main>
        <Footer />
      </div>
    );
  }

  // Busca produtos relacionados da mesma categoria
  const relatedProducts = allProducts.filter(
    p => p.id !== product.id && p.categoria?.id === product.categoria?.id
  ).slice(0, 3);

  return (
    <div>
      <Header />

      <main className={styles.productMain}>
        <div className={styles.backLink}>
          <Link to="/">← Voltar ao catálogo</Link>
        </div>

        <section className={styles.productHero}>
          <div className={styles.imageColumn}>
            <div className={styles.imageCard}>
              <img src={mainImgSrc} alt={product.nome} onError={() => setMainImgSrc(semImagem)} />
            </div>

            {product.imagens && product.imagens.length > 1 && (
              <div className={styles.thumbnailList}>
                {product.imagens.slice(1).map((imagem) => {
                  const imgUrl = getImageUrl(imagem.url);
                  return (
                    <button
                      key={imagem.id}
                      type="button"
                      className={`${styles.thumbnailButton} ${activeImage === imgUrl ? styles.active : ''}`}
                      onClick={() => {
                        setActiveImage(imgUrl);
                        setMainImgSrc(imgUrl);
                      }}
                    >
                      <img src={imgUrl} alt={`Miniatura de ${product.nome}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <aside className={styles.summaryCard}>
            <div className={styles.topMeta}>
              <span className={styles.productCategory}>{product.categoria?.nome}</span>
              <span className={styles.skuLabel}>SKU {product.id}</span>
            </div>

            <h1>{product.nome}</h1>

            <div className={styles.priceBlock}>
              <p className={styles.productPrice}>R$ {productPrice}</p>
              <span className={`${styles.stockPill} ${Number(product.estoque_atual) > 0 ? styles.stockIn : styles.stockOut}`}>
                {product.estoque_atual > 0 ? `${product.estoque_atual} em estoque` : 'Fora de estoque'}
              </span>
            </div>

            <p className={styles.shortDescription}>{product.descricao}</p>

            <div className={styles.productFacts}>
              <div className={styles.factItem}>
                <span>Categoria</span>
                <strong>{product.categoria?.nome || '—'}</strong>
              </div>
              <div className={styles.factItem}>
                <span>Disponibilidade</span>
                <strong>{product.estoque_atual > 0 ? 'Pronto para envio' : 'Sem estoque'}</strong>
              </div>
              {product.peso && (
                <div className={styles.factItem}>
                  <span>Peso</span>
                  <strong>{product.peso} kg</strong>
                </div>
              )}
            </div>

            {product.variacoes?.length > 0 && (
              <div className={styles.variationBlock}>
                <span className={styles.variationLabel}>Variações</span>
                <div className={styles.variationOptions}>
                  {product.variacoes.map((variation) => (
                    <button key={variation} type="button" className={styles.variationOption}>
                      {variation}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.actionGroup}>
              <button
                className={`${styles.btn} ${styles.primaryButton}`}
                onClick={() => handleAddToCart(false)}
                disabled={isOutOfStock}
                aria-live="polite"
              >
                {isOutOfStock ? 'Fora de estoque' : justAdded ? 'Adicionado' : 'Adicionar ao carrinho'}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.secondaryButton}`}
                onClick={() => handleAddToCart(true)}
                disabled={isOutOfStock}
              >
                Comprar agora
              </button>
            </div>

            <div className={styles.badgeGroup}>
              <span className={styles.badge}>Frete rápido</span>
              <span className={styles.badge}>Garantia de qualidade</span>
            </div>
          </aside>
        </section>

        <section className={styles.productDetailsSection}>
          <div className={styles.descriptionSection}>
            <h2>Descrição do produto</h2>
            <p>{product.descricao}</p>
          </div>
          <aside className={styles.detailsSidebar}>
            <ProductDetailsCard product={product} />
          </aside>
        </section>

        <RelatedProducts products={relatedProducts} />
      </main>

      <Footer />
    </div>
  );
}

export default ProductPage;
