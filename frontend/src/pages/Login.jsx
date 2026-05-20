import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import styles from './Auth.module.css';
import logo from '../assets/logo/logo.png';
import { loginUser, saveAuthSession } from '../services/api';

const Login = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({
        email: '',
        senha: '',
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const session = await loginUser(form);
            saveAuthSession(session);
            navigate(location.state?.from || '/');
        } catch (err) {
            setError(err.message || 'E-mail ou senha inválidos.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.leftPanel}>
                <div className={styles.formContainer}>
                    <h1 className={styles.title}>Bem-vindo</h1>
                    <p className={styles.subtitle}>Entre com suas credenciais para acessar sua conta</p>

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>E-mail</label>
                            <input
                                type="email"
                                name="email"
                                className={styles.input}
                                placeholder="seu@email.com"
                                value={form.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Senha</label>
                            <div className={styles.inputWrapper}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="senha"
                                    className={styles.input}
                                    placeholder="********"
                                    value={form.senha}
                                    onChange={handleChange}
                                    required
                                />
                                <button type="button" className={styles.iconButton} onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && <span className={styles.errorText}>{error}</span>}

                        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                            {isSubmitting ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>

                    <div className={styles.links}>
                        <Link to="#" className={styles.link}>Esqueci minha senha</Link>
                        <span className={styles.link}>
                            Não tem uma conta? <Link to="/cadastro" className={`${styles.link} ${styles.bold}`}>Criar conta</Link>
                        </span>
                    </div>
                </div>
            </div>

            <div className={styles.rightPanel}>
                <div className={styles.circle1}></div>
                <div className={styles.circle2}></div>
                <div className={styles.circle3}></div>
                <img src={logo} alt="Três Pescadores Store" className={styles.logo} />
            </div>
        </div>
    );
};

export default Login;
