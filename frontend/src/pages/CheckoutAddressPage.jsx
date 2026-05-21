import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { getUserAddresses } from '../services/api';
import styles from './CheckoutAddressPage.module.css';

function formatCep(value = '') {
    const digits = String(value).replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) {
        return digits;
    }
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function getAddressLabel(address) {
    return (
        address?.apelido
        || address?.label
        || address?.type
        || address?.name
        || address?.title
        || address?.address_type
        || 'Endereço cadastrado'
    );
}

function getAddressCity(address) {
    return address?.cidade?.nome || address?.cidade || '';
}

function getAddressState(address) {
    return (
        address?.estado?.uf
        || address?.estado?.sigla
        || address?.estado?.code
        || address?.estado?.nome
        || address?.cidade?.estado?.uf
        || address?.cidade?.estado?.sigla
        || address?.cidade?.estado?.code
        || address?.cidade?.estado?.nome
        || ''
    );
}

function getAddressLine1(address) {
    const street = address?.logradouro || address?.rua || '';
    const number = address?.numero || '';
    return [street, number].filter(Boolean).join(', ');
}

function getAddressNeighborhood(address) {
    return address?.bairro || '';
}

function getAddressComplement(address) {
    return address?.complemento || '';
}

function buildAddressSummary(address) {
    const city = getAddressCity(address);
    const state = getAddressState(address);
    return [city, state].filter(Boolean).join('/');
}

const CheckoutAddressPage = () => {
    const { cart } = useCart();
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAddresses = async () => {
            try {
                setLoading(true);
                const userAddresses = await getUserAddresses();
                setAddresses(Array.isArray(userAddresses) ? userAddresses : []);
                setError('');
            } catch (err) {
                console.error('Erro ao buscar endereços do usuário:', err);
                setError('Falha ao buscar endereços. Tente novamente mais tarde.');
                setAddresses([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAddresses();
    }, []);

    const selectedAddress = useMemo(
        () => addresses.find((address) => String(address.id) === String(selectedAddressId)) || null,
        [addresses, selectedAddressId],
    );

    const cartSubtotal = useMemo(() => {
        const items = Array.isArray(cart?.items) ? cart.items : [];
        const computedSubtotal = items.reduce((total, item) => {
            const product = item.product || {};
            const price = Number(product.preco_venda ?? product.preco ?? 0) || 0;
            return total + price * Number(item.quantity ?? 0);
        }, 0);

        return Number(cart?.subtotal ?? computedSubtotal ?? 0) || 0;
    }, [cart]);

    const handleSelectAddress = (addressId) => {
        setSelectedAddressId(addressId);
        localStorage.setItem('checkout_address_id', String(addressId));
    };

    const handleContinue = () => {
        if (!selectedAddressId) {
            return;
        }

        localStorage.setItem('checkout_address_id', String(selectedAddressId));
        navigate('/checkout/shipping', { state: { addressId: selectedAddressId } });
    };

    const handleAddNewAddress = () => {
        navigate('/meus-enderecos?redirect=checkout');
    };

    return (
        <div className={styles.pageContainer}>
            <Header />
            <main className={styles.mainContent}>
                <section className={styles.hero}>
                    <div>
                        <span className={styles.kicker}>Checkout</span>
                        <h1 className={styles.title}>Selecionar endereço</h1>
                        <p className={styles.subtitle}>Escolha onde o pedido será entregue antes de seguir para o frete.</p>
                    </div>
                </section>

                <nav className={styles.steps} aria-label="Etapas do checkout">
                    <div className={styles.stepItem}>
                        <span className={styles.stepDot}>1</span>
                        <span>Carrinho</span>
                    </div>
                    <span className={styles.stepLine} aria-hidden="true" />
                    <div className={`${styles.stepItem} ${styles.stepActive}`}>
                        <span className={styles.stepDot}>2</span>
                        <span>Endereço</span>
                    </div>
                    <span className={styles.stepLine} aria-hidden="true" />
                    <div className={styles.stepItem}>
                        <span className={styles.stepDot}>3</span>
                        <span>Entrega</span>
                    </div>
                    <span className={styles.stepLine} aria-hidden="true" />
                    <div className={styles.stepItem}>
                        <span className={styles.stepDot}>4</span>
                        <span>Pagamento</span>
                    </div>
                </nav>

                {loading && <div className={styles.stateCard}>Carregando endereços...</div>}
                {!loading && error && <div className={styles.errorCard}>{error}</div>}

                {!loading && !error && (
                    <section className={styles.checkoutLayout}>
                        <div className={styles.leftColumn}>
                            {addresses.length === 0 ? (
                                <div className={styles.emptyCard}>
                                    <h2>Você ainda não possui endereços cadastrados</h2>
                                    <p>Cadastre um endereço para continuar sua compra.</p>
                                </div>
                            ) : (
                                <div className={styles.addressList} aria-label="Lista de endereços">
                                    {addresses.map((address) => {
                                        const isSelected = String(selectedAddressId) === String(address.id);
                                        const cep = formatCep(address?.cep);
                                        const line1 = getAddressLine1(address);
                                        const neighborhood = getAddressNeighborhood(address);
                                        const cityState = buildAddressSummary(address);
                                        const complement = getAddressComplement(address);

                                        return (
                                            <button
                                                key={address.id}
                                                type="button"
                                                className={`${styles.addressCard} ${isSelected ? styles.addressCardSelected : ''}`}
                                                onClick={() => handleSelectAddress(address.id)}
                                                aria-pressed={isSelected}
                                            >
                                                <div className={styles.addressTopRow}>
                                                    <div>
                                                        <span className={styles.addressLabel}>{getAddressLabel(address)}</span>
                                                        <div className={styles.addressMetaRow}>
                                                            {isSelected && <span className={styles.selectedBadge}>Selecionado</span>}
                                                        </div>
                                                    </div>
                                                    <span className={`${styles.radioMark} ${isSelected ? styles.radioMarkSelected : ''}`} aria-hidden="true">
                                                        {isSelected ? '✓' : ''}
                                                    </span>
                                                </div>

                                                <div className={styles.addressBody}>
                                                    {line1 && <p>{line1}</p>}
                                                    {(neighborhood || cityState) && (
                                                        <p>
                                                            {[neighborhood, cityState].filter(Boolean).join(' - ')}
                                                        </p>
                                                    )}
                                                    {cep && <p>CEP: {cep}</p>}
                                                    {complement && <p className={styles.complement}>{complement}</p>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <button type="button" onClick={handleAddNewAddress} className={styles.secondaryButton}>
                                Cadastrar novo endereço
                            </button>
                        </div>

                        <aside className={styles.summaryCard} aria-label="Resumo da compra">
                            <span className={styles.sectionKicker}>Resumo da compra</span>
                            <h2 className={styles.summaryTitle}>Seu pedido</h2>

                            <div className={styles.summaryRows}>
                                <div className={styles.summaryRow}>
                                    <span>Subtotal dos produtos</span>
                                    <strong>R$ {cartSubtotal.toFixed(2).replace('.', ',')}</strong>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span>Frete</span>
                                    <strong>A calcular</strong>
                                </div>
                                <div className={styles.summaryDivider} />
                                <div className={styles.summaryRowTotal}>
                                    <span>Total parcial</span>
                                    <strong>R$ {cartSubtotal.toFixed(2).replace('.', ',')}</strong>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleContinue}
                                className={styles.primaryButton}
                                disabled={!selectedAddressId}
                            >
                                Continuar para entrega
                            </button>
                        </aside>
                    </section>
                )}

                {!loading && selectedAddress && (
                    <p className={styles.selectionHint}>
                        Próximo passo: {getAddressLabel(selectedAddress)} será usado na entrega.
                    </p>
                )}
            </main>
        </div>
    );
};

export default CheckoutAddressPage;
