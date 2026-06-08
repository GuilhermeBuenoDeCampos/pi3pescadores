import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import checkoutStyles from './CheckoutAddressPage.module.css';
import styles from './CheckoutPaymentPage.module.css';

const CheckoutSuccessPage = () => (
    <div className={checkoutStyles.pageContainer}>
        <Header />
        <main className={checkoutStyles.mainContent}>
            <section className={checkoutStyles.hero}>
                <div>
                    <span className={checkoutStyles.kicker}>Checkout</span>
                    <h1 className={checkoutStyles.title}>Pedido enviado pelo WhatsApp</h1>
                    <p className={checkoutStyles.subtitle}>
                        Recebemos sua solicitação pelo WhatsApp. Nossa equipe entrará em contato para enviar as informações do PIX e confirmar os detalhes do pedido.
                    </p>
                </div>
            </section>

            <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                    <span>Próximo passo</span>
                    <h2>Aguarde nosso contato</h2>
                    <p>
                        Esta confirmação ainda não cria um pedido no sistema. O atendimento será concluído diretamente com nossa equipe.
                    </p>
                </div>

                <div className={styles.successActions}>
                    <Link to="/" className={checkoutStyles.primaryButton}>Voltar à página inicial</Link>
                    <Link to="/" className={checkoutStyles.secondaryButton}>Continuar comprando</Link>
                </div>
            </section>
        </main>
    </div>
);

export default CheckoutSuccessPage;
