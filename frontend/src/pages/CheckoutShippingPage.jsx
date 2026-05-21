import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { calculateShipping, getUserAddresses } from '../services/api';
import checkoutStyles from './CheckoutAddressPage.module.css';
import styles from './CheckoutShippingPage.module.css';

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

function getAddressLabel(address) {
    return (
        address?.apelido
        || address?.label
        || address?.type
        || address?.name
        || address?.title
        || address?.address_type
        || 'Endereco cadastrado'
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
    const city = getAddressCity(address);
    const state = getAddressState(address);
    return [city, state].filter(Boolean).join('/');
}

function getAddressCep(address) {
    return String(address?.zip_code || address?.cep || address?.postalCode || '').replace(/\D/g, '');
}

function getShippingKey(option) {
    return String(option?.id || option?.code || option?.name || option?.type || '');
}

function getShippingName(option) {
    return option?.name || option?.type || option?.service || 'Frete';
}

function getShippingDescription(option) {
    const name = getShippingName(option).toUpperCase();

    if (name.includes('SEDEX')) {
        return 'Entrega rapida';
    }

    if (name.includes('PAC')) {
        return 'Entrega economica';
    }

    return option?.description || 'Entrega pelos Correios';
}

function getShippingPrice(option) {
    return Number(option?.price || option?.valor || option?.value || 0) || 0;
}

function getShippingDays(option) {
    return Number(option?.delivery_time || option?.days || option?.prazo || 0) || 0;
}

function formatDeliveryTime(days) {
    const parsedDays = Number(days || 0);

    if (parsedDays === 1) {
        return '1 dia util';
    }

    return `${parsedDays} dias uteis`;
}

function normalizeShippingOption(option) {
    if (!option) {
        return null;
    }

    const name = getShippingName(option);

    return {
        ...option,
        key: getShippingKey(option) || name,
        code: option?.code || option?.id || '',
        name,
        description: getShippingDescription(option),
        price: getShippingPrice(option),
        delivery_time: getShippingDays(option),
    };
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

const CheckoutShippingPage = () => {
    const { cart, isCartLoading } = useCart();
    const location = useLocation();
    const navigate = useNavigate();
    const [addresses, setAddresses] = useState([]);
    const [shippingOptions, setShippingOptions] = useState([]);
    const [selectedShippingKey, setSelectedShippingKey] = useState(() => getShippingKey(readSavedShipping()) || '');
    const [loading, setLoading] = useState(true);
    const [loadingShipping, setLoadingShipping] = useState(false);
    const [error, setError] = useState('');
    const [shippingError, setShippingError] = useState('');

    const selectedAddressId = useMemo(
        () => location.state?.addressId || localStorage.getItem('checkout_address_id') || '',
        [location.state],
    );

    useEffect(() => {
        const fetchAddresses = async () => {
            try {
                setLoading(true);
                const userAddresses = await getUserAddresses();
                setAddresses(Array.isArray(userAddresses) ? userAddresses : []);
                setError('');
            } catch (err) {
                console.error('Erro ao buscar enderecos do usuario:', err);
                setError('Falha ao buscar endereco selecionado. Tente novamente mais tarde.');
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

    const displayItems = useMemo(
        () => (Array.isArray(cart?.items) ? cart.items : []),
        [cart],
    );

    const selectedShipping = useMemo(
        () => shippingOptions.find((option) => getShippingKey(option) === selectedShippingKey) || null,
        [shippingOptions, selectedShippingKey],
    );

    const cartSubtotal = useMemo(() => {
        const computedSubtotal = displayItems.reduce((total, item) => {
            const product = item.product || {};
            const price = Number(product.preco_venda ?? product.preco ?? 0) || 0;
            return total + price * Number(item.quantity ?? 0);
        }, 0);

        return Number(cart?.subtotal ?? computedSubtotal ?? 0) || 0;
    }, [cart, displayItems]);

    useEffect(() => {
        if (isCartLoading) {
            return undefined;
        }

        if (!selectedAddress || displayItems.length === 0) {
            setShippingOptions([]);
            setSelectedShippingKey('');
            localStorage.removeItem('checkout_shipping_option');
            return;
        }

        const cep = getAddressCep(selectedAddress);

        if (cep.length !== 8) {
            setShippingOptions([]);
            setSelectedShippingKey('');
            setShippingError('O endereco selecionado nao possui um CEP valido para calcular o frete.');
            localStorage.removeItem('checkout_shipping_option');
            return;
        }

        let active = true;

        const fetchShippingOptions = async () => {
            const savedShipping = normalizeShippingOption(readSavedShipping());

            setLoadingShipping(true);
            setShippingError('');
            setShippingOptions([]);
            setSelectedShippingKey('');
            localStorage.removeItem('checkout_shipping_option');

            const products = displayItems.map((item) => ({
                ...(item.product || {}),
                quantity: item.quantity,
            }));

            try {
                const data = await calculateShipping({
                    to_postal_code: cep,
                    products,
                });

                if (!active) {
                    return;
                }

                const normalizedOptions = Array.isArray(data)
                    ? data
                        .map(normalizeShippingOption)
                        .filter((option) => option && option.price > 0 && option.delivery_time)
                    : [];

                setShippingOptions(normalizedOptions);

                if (normalizedOptions.length === 0) {
                    setShippingError('Nenhuma opcao de frete disponivel para este endereco.');
                    return;
                }

                const savedOption = savedShipping
                    ? normalizedOptions.find((option) => (
                        getShippingKey(option) === getShippingKey(savedShipping)
                        || getShippingName(option) === getShippingName(savedShipping)
                    ))
                    : null;

                if (savedOption) {
                    setSelectedShippingKey(getShippingKey(savedOption));
                    localStorage.setItem('checkout_shipping_option', JSON.stringify(savedOption));
                }
            } catch (err) {
                if (!active) {
                    return;
                }

                console.error('Erro ao calcular frete:', err);
                setShippingError(err.message || 'Erro ao calcular frete. Tente novamente mais tarde.');
                setShippingOptions([]);
            } finally {
                if (active) {
                    setLoadingShipping(false);
                }
            }
        };

        fetchShippingOptions();

        return () => {
            active = false;
        };
    }, [selectedAddress, displayItems, isCartLoading]);

    const shippingPrice = selectedShipping ? getShippingPrice(selectedShipping) : 0;
    const orderTotal = cartSubtotal + shippingPrice;

    const handleSelectShipping = (option) => {
        setSelectedShippingKey(getShippingKey(option));
        localStorage.setItem('checkout_shipping_option', JSON.stringify(option));
    };

    const handleContinue = () => {
        if (!selectedShipping) {
            return;
        }

        localStorage.setItem('checkout_shipping_option', JSON.stringify(selectedShipping));
        navigate('/checkout/payment', {
            state: {
                addressId: selectedAddressId,
                shipping: selectedShipping,
            },
        });
    };

    const handleChangeAddress = () => {
        navigate('/checkout/address');
    };

    return (
        <div className={checkoutStyles.pageContainer}>
            <Header />
            <main className={checkoutStyles.mainContent}>
                <section className={checkoutStyles.hero}>
                    <div>
                        <span className={checkoutStyles.kicker}>Checkout</span>
                        <h1 className={checkoutStyles.title}>Escolha a entrega do pedido</h1>
                        <p className={checkoutStyles.subtitle}>Selecione o frete recalculado para o endereco escolhido.</p>
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
                        <span>Endereco</span>
                    </div>
                    <span className={checkoutStyles.stepLine} aria-hidden="true" />
                    <div className={`${checkoutStyles.stepItem} ${checkoutStyles.stepActive}`}>
                        <span className={checkoutStyles.stepDot}>3</span>
                        <span>Entrega</span>
                    </div>
                    <span className={checkoutStyles.stepLine} aria-hidden="true" />
                    <div className={checkoutStyles.stepItem}>
                        <span className={checkoutStyles.stepDot}>4</span>
                        <span>Pagamento</span>
                    </div>
                </nav>

                {loading && <div className={checkoutStyles.stateCard}>Carregando entrega...</div>}
                {!loading && error && <div className={checkoutStyles.errorCard}>{error}</div>}

                {!loading && !error && !selectedAddress && (
                    <div className={checkoutStyles.emptyCard}>
                        <h2>Nenhum endereco selecionado</h2>
                        <p>Volte para a etapa anterior e escolha um endereco antes de selecionar o frete.</p>
                        <button type="button" onClick={handleChangeAddress} className={checkoutStyles.secondaryButton}>
                            Selecionar endereco
                        </button>
                    </div>
                )}

                {!loading && !error && selectedAddress && (
                    <section className={checkoutStyles.checkoutLayout}>
                        <div className={checkoutStyles.leftColumn}>
                            <section className={styles.sectionPanel} aria-labelledby="shipping-title">
                                <div className={styles.sectionHeading}>
                                    <div>
                                        <h2 id="shipping-title">Selecione o frete da compra</h2>
                                        <p>As opcoes abaixo usam o CEP do endereco selecionado.</p>
                                    </div>
                                </div>

                                <article className={styles.selectedAddressCard}>
                                    <span className={styles.addressEyebrow}>Entregar em</span>
                                    <span className={styles.addressTitle}>{getAddressLabel(selectedAddress)}</span>
                                    <div className={styles.addressDetails}>
                                        {getAddressLine1(selectedAddress) && <p>{getAddressLine1(selectedAddress)}</p>}
                                        {getAddressCityState(selectedAddress) && <p>{getAddressCityState(selectedAddress)}</p>}
                                        {getAddressCep(selectedAddress) && <p>CEP: {formatCep(getAddressCep(selectedAddress))}</p>}
                                    </div>
                                </article>

                                {isCartLoading && <div className={checkoutStyles.stateCard}>Carregando carrinho...</div>}

                                {!isCartLoading && displayItems.length === 0 && (
                                    <div className={checkoutStyles.emptyCard}>
                                        <h2>Carrinho vazio</h2>
                                        <p>Adicione produtos ao carrinho antes de calcular o frete.</p>
                                    </div>
                                )}

                                {!isCartLoading && loadingShipping && <div className={checkoutStyles.stateCard}>Calculando frete...</div>}

                                {!isCartLoading && !loadingShipping && shippingError && (
                                    <div className={checkoutStyles.errorCard}>{shippingError}</div>
                                )}

                                {!isCartLoading && !loadingShipping && !shippingError && shippingOptions.length === 0 && displayItems.length > 0 && (
                                    <div className={checkoutStyles.emptyCard}>
                                        <h2>Nenhuma opcao disponivel</h2>
                                        <p>Nao encontramos modalidades de entrega para este endereco.</p>
                                    </div>
                                )}

                                {!isCartLoading && !loadingShipping && shippingOptions.length > 0 && (
                                    <div className={styles.shippingList} aria-label="Opcoes de entrega">
                                        {shippingOptions.map((option) => {
                                            const optionKey = getShippingKey(option);
                                            const isSelected = selectedShippingKey === optionKey;
                                            const deliveryTime = getShippingDays(option);

                                            return (
                                                <button
                                                    key={optionKey}
                                                    type="button"
                                                    className={`${styles.shippingOption} ${isSelected ? styles.shippingOptionSelected : ''}`}
                                                    onClick={() => handleSelectShipping(option)}
                                                    aria-pressed={isSelected}
                                                >
                                                    <span className={styles.optionMain}>
                                                        <span className={styles.optionName}>
                                                            {getShippingName(option)}
                                                            {option.code && <small>Codigo {option.code}</small>}
                                                        </span>
                                                        <span className={styles.optionDescription}>{option.description}</span>
                                                    </span>
                                                    <span className={styles.deliveryEstimate}>{formatDeliveryTime(deliveryTime)}</span>
                                                    <span className={styles.optionPrice}>{formatCurrency(getShippingPrice(option))}</span>
                                                    <span className={`${styles.checkMark} ${isSelected ? styles.checkMarkSelected : ''}`} aria-hidden="true" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                            </section>
                        </div>

                        <aside className={checkoutStyles.summaryCard} aria-label="Resumo da compra">
                            <span className={checkoutStyles.sectionKicker}>Resumo da compra</span>
                            <h2 className={checkoutStyles.summaryTitle}>Seu pedido</h2>

                            <div className={checkoutStyles.summaryRows}>
                                <div className={checkoutStyles.summaryRow}>
                                    <span>Subtotal dos produtos</span>
                                    <strong>{formatCurrency(cartSubtotal)}</strong>
                                </div>
                                <div className={checkoutStyles.summaryRow}>
                                    <span>Frete</span>
                                    <strong>{selectedShipping ? formatCurrency(getShippingPrice(selectedShipping)) : 'Selecione'}</strong>
                                </div>
                                <div className={checkoutStyles.summaryDivider} />
                                <div className={checkoutStyles.summaryRowTotal}>
                                    <span>Total</span>
                                    <strong>{formatCurrency(orderTotal)}</strong>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleContinue}
                                className={checkoutStyles.primaryButton}
                                disabled={!selectedShipping || loadingShipping || isCartLoading}
                            >
                                Continuar para pagamento
                            </button>
                        </aside>
                    </section>
                )}
            </main>
        </div>
    );
};

export default CheckoutShippingPage;
