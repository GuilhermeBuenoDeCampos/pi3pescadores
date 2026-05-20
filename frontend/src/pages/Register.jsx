import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import styles from './Auth.module.css';
import logo from '../assets/logo/logo.png';
import { registerUser } from '../services/api';

const Register = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [form, setForm] = useState({
        nome: '',
        email: '',
        telefone: '',
        cpf: '',
        senha: '',
        confirmarSenha: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

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
        setSuccess('');

        if (form.senha !== form.confirmarSenha) {
            setError('As senhas precisam ser iguais.');
            return;
        }

        setIsSubmitting(true);

        try {
            await registerUser({
                nome: form.nome,
                email: form.email,
                telefone: form.telefone,
                cpf: form.cpf,
                senha: form.senha,
                tipo_usuario: 'cliente',
            });

            setSuccess('Conta criada com sucesso. Redirecionando para o login...');
            setTimeout(() => navigate('/login'), 1200);
        } catch (err) {
            setError(err.message || 'Não foi possível criar a conta.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.leftPanel}>
                <div className={styles.formContainer}>
                    <h1 className={styles.title}>Criar conta</h1>
                    <p className={styles.subtitle}>Preencha os dados para se cadastrar na plataforma</p>

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Nome completo</label>
                            <input
                                type="text"
                                name="nome"
                                className={styles.input}
                                placeholder="Seu nome completo"
                                value={form.nome}
                                onChange={handleChange}
                                required
                            />
                        </div>

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
                            <label className={styles.label}>CPF</label>
                            <input
                                type="text"
                                name="cpf"
                                className={styles.input}
                                placeholder="000.000.000-00"
                                value={form.cpf}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Telefone</label>
                            <input
                                type="tel"
                                name="telefone"
                                className={styles.input}
                                placeholder="(00) 00000-0000"
                                value={form.telefone}
                                onChange={handleChange}
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
                                    minLength={6}
                                    required
                                />
                                <button type="button" className={styles.iconButton} onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Confirmar senha</label>
                            <div className={styles.inputWrapper}>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmarSenha"
                                    className={styles.input}
                                    placeholder="********"
                                    value={form.confirmarSenha}
                                    onChange={handleChange}
                                    minLength={6}
                                    required
                                />
                                <button type="button" className={styles.iconButton} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && <span className={styles.errorText}>{error}</span>}
                        {success && <span className={styles.successText}>{success}</span>}

                        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                            {isSubmitting ? 'Criando...' : 'Criar conta'}
                        </button>
                    </form>

                    <div className={styles.links}>
                        <span className={styles.link}>
                            Já tem uma conta? <Link to="/login" className={`${styles.link} ${styles.bold}`}>Entrar</Link>
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

export default Register;
