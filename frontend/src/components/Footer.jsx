import styles from './Footer.module.css';

const year = new Date().getFullYear();

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div>
          <div className={styles.footerLogo}>Três <span>Pescadores</span></div>
          <p className={styles.footerDesc}>
            Loja de artigos religiosos católicos para fé, devoção e presentes com significado.
          </p>
          <div className={styles.socials} aria-label="Redes sociais">
            <span>📘</span>
            <span>📷</span>
            <span>💬</span>
          </div>
        </div>

        <div className={styles.footerCol}>
          <h4>Loja</h4>
          <a href="/">Início</a>
          <a href="/#categories">Categorias</a>
          <a href="/#catalog">Catálogo</a>
        </div>

        <div className={styles.footerCol}>
          <h4>Produtos</h4>
          <a href="/#catalog">Imagens</a>
          <a href="/#catalog">Terços</a>
          <a href="/#catalog">Bíblias</a>
          <a href="/#catalog">Oratórios</a>
        </div>

        <div className={styles.footerCol}>
          <h4>Contato</h4>
          <p>Endereço, telefone, e-mail e redes sociais não estão cadastrados no frontend atual.</p>
          <p>Use os canais oficiais da Três Pescadores Store para atendimento.</p>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <span>© {year} Três Pescadores. Todos os direitos reservados.</span>
        <div className={styles.payments}>
          <span>Catálogo</span>
          <strong>Online</strong>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
