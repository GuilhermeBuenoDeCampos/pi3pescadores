import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { getAuthUser, getUserAddresses } from '../services/api';
import checkoutStyles from './CheckoutAddressPage.module.css';
import styles from './CheckoutPaymentPage.module.css';

function formatCurrency(value = 0) {
    return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

function formatCep(value = '') {
    const digits = String(value).replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) {
        return digits;
    }
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function getProductPrice(product) {
    return Number(product?.preco_venda ?? product?.preco ?? 0) || 0;
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

function getAddressCityState(address) {
    return [getAddressCity(address), getAddressState(address)].filter(Boolean).join('/');
}

function getAddressCep(address) {
    return String(address?.zip_code || address?.cep || address?.postalCode || '').replace(/\D/g, '');
}

function readSavedShipping() {
    const rawValue = localStorage.getItem('checkout_shipping_option');

    if (!rawValue) {
        return null;
    }

    try {
        return JSON.parse(rawValue);
    } catch {
        localStorage.removeItem('checkout_shipping_option');
        return null;
    }
}

function getShippingName(option) {
    return option?.name || option?.type || option?.service || '';
}

function getShippingPrice(option) {
    return Number(option?.price || option?.valor || option?.value || 0) || 0;
}

function getShippingDays(option) {
    return Number(option?.delivery_time || option?.days || option?.prazo || 0) || 0;
}

function formatDeliveryTime(days) {
    const parsedDays = Number(days || 0);
    return parsedDays === 1 ? '1 dia útil' : `${parsedDays} dias úteis`;
}

function buildWhatsAppMessage({ user, items, address, shipping, subtotal, total }) {
    const customerName = user?.nome || user?.name || '';
    const productLines = items.map((item) => {
        const product = item.product || {};
        const quantity = Number(item.quantity || 0);
        const unitPrice = getProductPrice(product);
        const itemTotal = unitPrice * quantity;

        return `- ${quantity}x ${product.nome || product.name || 'Produto'} | Unitário: ${formatCurrency(unitPrice)} | Total: ${formatCurrency(itemTotal)}`;
    });

    const addressLines = [
        getAddressLabel(address),
        getAddressLine1(address),
        getAddressCityState(address),
        getAddressCep(address) ? `CEP ${formatCep(getAddressCep(address))}` : '',
    ].filter(Boolean);

    return [
        'Olá! Gostaria de finalizar minha compra pelo WhatsApp.',
        '',
        customerName ? `Cliente: ${customerName}` : '',
        '',
        'Produtos:',
        ...productLines,
        '',
        `Subtotal: ${formatCurrency(subtotal)}`,
        `Frete: ${getShippingName(shipping)} - ${formatCurrency(getShippingPrice(shipping))}`,
        `Prazo: ${formatDeliveryTime(getShippingDays(shipping))}`,
        `Total final: ${formatCurrency(total)}`,
        '',
        'Endereço de entrega:',
        ...addressLines,
        '',
        'Forma de pagamento: PIX via WhatsApp',
    ].filter((line, index, lines) => line || lines[index - 1]).join('\n');
}

const CheckoutPaymentPage = () => {
    const { cart, isCartLoading } = useCart();
    const navigate = useNavigate();
    const [addresses, setAddresses] = useState([]);
    const [loadingAddresses, setLoadingAddresses] = useState(true);
    const [error, setError] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('pix_whatsapp');
    const [validationError, setValidationError] = useState('');

    const user = useMemo(() => getAuthUser(), []);
    const selectedAddressId = localStorage.getItem('checkout_address_id') || '';
    const selectedShipping = useMemo(() => readSavedShipping(), []);

    useEffect(() => {
        const fetchAddresses = async () => {
            try {
                setLoadingAddresses(true);
                const userAddresses = await getUserAddresses();
                setAddresses(Array.isArray(userAddresses) ? userAddresses : []);
                setError('');
            } catch (err) {
                console.error('Erro ao buscar endereço do checkout:', err);
                setError('Não foi possível carregar o endereço selecionado.');
                setAddresses([]);
            } finally {
                setLoadingAddresses(false);
            }
        };

        fetchAddresses();
    }, []);

    const displayItems = useMemo(
        () => (Array.isArray(cart?.items) ? cart.items : []),
        [cart],
    );

    const selectedAddress = useMemo(
        () => addresses.find((address) => String(address.id) === String(selectedAddressId)) || null,
        [addresses, selectedAddressId],
    );

    const subtotal = useMemo(() => (
        displayItems.reduce((total, item) => {
            const product = item.product || {};
            return total + getProductPrice(product) * Number(item.quantity || 0);
        }, 0)
    ), [displayItems]);

    const shippingPrice = selectedShipping ? getShippingPrice(selectedShipping) : 0;
    const total = subtotal + shippingPrice;
    const loading = isCartLoading || loadingAddresses;

    const validateCheckout = () => {
        if (displayItems.length === 0) {
            return 'Seu carrinho está vazio.';
        }

        if (!selectedAddressId || !selectedAddress) {
            return 'Selecione um endereço antes de finalizar.';
        }

        if (!selectedShipping || !getShippingName(selectedShipping)) {
            return 'Selecione uma opção de frete antes de finalizar.';
        }

        if (paymentMethod !== 'pix_whatsapp') {
            return 'Selecione a forma de pagamento.';
        }

        return '';
    };

    const handleFinish = () => {
        const validationMessage = validateCheckout();

        if (validationMessage) {
            setValidationError(validationMessage);
            return;
        }

        const message = buildWhatsAppMessage({
            user,
            items: displayItems,
            address: selectedAddress,
            shipping: selectedShipping,
            subtotal,
            total,
        });

        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
        navigate('/checkout/success');
    };

    return (
        <div className={checkoutStyles.pageContainer}>
            <Header />
            <main className={checkoutStyles.mainContent}>
                <section className={checkoutStyles.hero}>
                    <div>
                        <span className={checkoutStyles.kicker}>Checkout</span>
                        <h1 className={checkoutStyles.title}>Pagamento</h1>
                        <p className={checkoutStyles.subtitle}>Revise sua compra e finalize o atendimento pelo WhatsApp.</p>
                    </div>
                </section>

                <nav className={checkoutStyles.steps} aria-label="Etapas do checkout">
                    <div className={checkoutStyles.stepItem}>
                        <span className={checkoutStyles.stepDot}>1</span>
                        <span>Carrinho</span>
                    </div>
                    <span className={checkoutStyles.stepLine} aria-hidden="true" />
                    <div className={checkoutStyles.stepItem}>
                        <span className={checkoutStyles.stepDot}>2</span>
                        <span>Endereço</span>
                    </div>
                    <span className={checkoutStyles.stepLine} aria-hidden="true" />
                    <div className={checkoutStyles.stepItem}>
                        <span className={checkoutStyles.stepDot}>3</span>
                        <span>Entrega</span>
                    </div>
                    <span className={checkoutStyles.stepLine} aria-hidden="true" />
                    <div className={`${checkoutStyles.stepItem} ${checkoutStyles.stepActive}`}>
                        <span className={checkoutStyles.stepDot}>4</span>
                        <span>Pagamento</span>
                    </div>
                </nav>

                {loading && <div className={checkoutStyles.stateCard}>Carregando revisão do pedido...</div>}
                {!loading && error && <div className={checkoutStyles.errorCard}>{error}</div>}

                {!loading && !error && (
                    <section className={checkoutStyles.checkoutLayout}>
                        <div className={checkoutStyles.leftColumn}>
                            <div className={styles.panel}>
                                <section className={styles.sectionCard}>
                                    <div className={styles.sectionHeader}>
                                        <span>Produtos</span>
                                        <h2>Resumo dos itens</h2>
                                    </div>

                                    {displayItems.length === 0 ? (
                                        <div className={checkoutStyles.emptyCard}>
                                            <h2>Carrinho vazio</h2>
                                            <p>Adicione produtos antes de finalizar pelo WhatsApp.</p>
                                        </div>
                                    ) : (
                                        <div className={styles.productList}>
                                            {displayItems.map((item) => {
                                                const product = item.product || {};
                                                const quantity = Number(item.quantity || 0);
                                                const unitPrice = getProductPrice(product);

                                                return (
                                                    <article key={item.itemId || item.id || product.id} className={styles.productCard}>
                                                        <div>
                                                            <div className={styles.productName}>{product.nome || product.name || 'Produto'}</div>
                                                            <div className={styles.productMeta}>
                                                                <span>{quantity} unidade(s)</span>
                                                                <span>{formatCurrency(unitPrice)} cada</span>
                                                            </div>
                                                        </div>
                                                        <strong className={styles.productTotal}>{formatCurrency(unitPrice * quantity)}</strong>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>

                                <section className={styles.sectionCard}>
                                    <div className={styles.sectionHeader}>
                                        <span>Entrega</span>
                                        <h2>Dados da entrega</h2>
                                    </div>

                                    <div className={styles.detailGrid}>
                                        <div className={styles.detailBlock}>
                                            <span className={styles.detailLabel}>Endereço selecionado</span>
                                            {selectedAddress ? (
                                                <>
                                                    <strong className={styles.detailTitle}>{getAddressLabel(selectedAddress)}</strong>
                                                    <div className={styles.addressLines}>
                                                        {getAddressLine1(selectedAddress) && <span>{getAddressLine1(selectedAddress)}</span>}
                                                        {getAddressCityState(selectedAddress) && <span>{getAddressCityState(selectedAddress)}</span>}
                                                        {getAddressCep(selectedAddress) && <span>CEP {formatCep(getAddressCep(selectedAddress))}</span>}
                                                    </div>
                                                </>
                                            ) : (
                                                <p className={styles.muted}>Nenhum endereço selecionado.</p>
                                            )}
                                        </div>

                                        <div className={styles.detailBlock}>
                                            <span className={styles.detailLabel}>Frete escolhido</span>
                                            {selectedShipping ? (
                                                <>
                                                    <strong className={styles.detailTitle}>{getShippingName(selectedShipping)}</strong>
                                                    <p className={styles.shippingMeta}>
                                                        {formatDeliveryTime(getShippingDays(selectedShipping))} - {formatCurrency(getShippingPrice(selectedShipping))}
                                                    </p>
                                                </>
                                            ) : (
                                                <p className={styles.muted}>Nenhum frete selecionado.</p>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                <section className={styles.sectionCard}>
                                    <div className={styles.sectionHeader}>
                                        <span>Pagamento</span>
                                        <h2>Forma de pagamento</h2>
                                        <p>
                                            Neste momento, a confirmação do pagamento será feita pelo WhatsApp. Após finalizar, nossa equipe entrará em contato para enviar as informações do PIX e confirmar o pedido.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        className={`${styles.paymentOption} ${paymentMethod === 'pix_whatsapp' ? styles.paymentOptionSelected : ''}`}
                                        onClick={() => setPaymentMethod('pix_whatsapp')}
                                        aria-pressed={paymentMethod === 'pix_whatsapp'}
                                    >
                                        <span className={`${styles.checkMark} ${paymentMethod === 'pix_whatsapp' ? styles.checkMarkSelected : ''}`} aria-hidden="true" />
                                        <span>
                                            <span className={styles.paymentTitle}>PIX via WhatsApp</span>
                                            <span className={styles.muted}>Receba a chave PIX e confirme o pedido com nossa equipe.</span>
                                        </span>
                                    </button>
                                </section>

                                {validationError && <div className={styles.validationError}>{validationError}</div>}
                            </div>
                        </div>

                        <aside className={checkoutStyles.summaryCard} aria-label="Resumo final da compra">
                            <span className={checkoutStyles.sectionKicker}>Resumo final</span>
                            <h2 className={checkoutStyles.summaryTitle}>Seu pedido</h2>

                            <div className={styles.summaryItems}>
                                {displayItems.length > 0 && (
                                    <div className={styles.summaryProducts}>
                                        {displayItems.map((item) => {
                                            const product = item.product || {};
                                            return (
                                                <div key={item.itemId || item.id || product.id} className={styles.summaryItem}>
                                                    <span>{item.quantity}x {product.nome || product.name || 'Produto'}</span>
                                                    <strong>{formatCurrency(getProductPrice(product) * Number(item.quantity || 0))}</strong>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className={checkoutStyles.summaryRow}>
                                    <span>Subtotal</span>
                                    <strong>{formatCurrency(subtotal)}</strong>
                                </div>
                                <div className={checkoutStyles.summaryRow}>
                                    <span>Frete {selectedShipping ? `(${getShippingName(selectedShipping)})` : ''}</span>
                                    <strong>{selectedShipping ? formatCurrency(shippingPrice) : 'Selecione'}</strong>
                                </div>
                                {selectedShipping && (
                                    <div className={checkoutStyles.summaryRow}>
                                        <span>Prazo</span>
                                        <strong>{formatDeliveryTime(getShippingDays(selectedShipping))}</strong>
                                    </div>
                                )}
                                <div className={checkoutStyles.summaryDivider} />
                                <div className={checkoutStyles.summaryRowTotal}>
                                    <span>Total final</span>
                                    <strong>{formatCurrency(total)}</strong>
                                </div>
                            </div>

                            <button
                                type="button"
                                className={checkoutStyles.primaryButton}
                                onClick={handleFinish}
                                disabled={loading}
                            >
                                Finalizar pelo WhatsApp
                            </button>
                        </aside>
                    </section>
                )}
            </main>
        </div>
    );
};

export default CheckoutPaymentPage;
