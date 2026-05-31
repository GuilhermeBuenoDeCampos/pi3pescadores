import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import styles from './Auth.module.css';
import logo from '../assets/logo/logo.png';
import { registerUser } from '../services/api';

const maskCpf = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.length > 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    if (digits.length > 6) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    if (digits.length > 3) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    return digits;
};

const maskTelefone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.length > 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length > 2) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length > 0) return `(${digits}`;
    return digits;
};

const isValidCpf = (value) => {
    const digits = value.replace(/\D/g, '');

    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

    const calculateDigit = (length) => {
        const sum = digits
            .slice(0, length)
            .split('')
            .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
        const remainder = (sum * 10) % 11;
        return remainder === 10 ? 0 : remainder;
    };

    return calculateDigit(9) === Number(digits[9])
        && calculateDigit(10) === Number(digits[10]);
};

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
        const maskedValue = name === 'cpf'
            ? maskCpf(value)
            : name === 'telefone'
                ? maskTelefone(value)
                : value;

        setForm((current) => ({
            ...current,
            [name]: maskedValue,
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

        if (!isValidCpf(form.cpf)) {
            setError('Informe um CPF válido.');
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
            setError(err.message || 'Nao foi possivel criar a conta.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.leftPanel}>
                <div className={styles.formContainer}>
                    <img src={logo} alt="Tres Pescadores Store" className={styles.mobileLogo} />
                    <h1 className={styles.title}>Criar Conta</h1>
                    <p className={styles.subtitle}>Preencha os dados para se cadastrar na plataforma</p>

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Nome Completo</label>
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
                                maxLength={14}
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
                                maxLength={15}
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
                            <label className={styles.label}>Confirmar Senha</label>
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
                            {isSubmitting ? 'Criando...' : 'Criar Conta'}
                        </button>
                    </form>

                    <div className={styles.links}>
                        <span className={styles.link}>
                            Ja tem uma conta? <Link to="/login" className={`${styles.link} ${styles.bold}`}>Entrar</Link>
                        </span>
                    </div>
                </div>
            </div>

            <div className={styles.rightPanel}>
                <div className={styles.circle1}></div>
                <div className={styles.circle2}></div>
                <div className={styles.circle3}></div>
                <img src={logo} alt="Tres Pescadores Store" className={styles.logo} />
            </div>
        </div>
    );
};

export default Register;
