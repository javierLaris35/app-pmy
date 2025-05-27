# 📦 App PMY - Paquetería del Yaqui

Aplicación web desarrollada para la gestión operativa de Paquetería del Yaqui. Esta plataforma permite el control de ingresos, envíos, clientes y seguimiento de paquetes en tiempo real.

## 🚀 Características principales

- 📊 Dashboard de ingresos, egresos y estadísticas.
- 🧾 Registro y seguimiento de envíos.
- 👤 Gestión de usuarios y clientes.
- 📍 Seguimiento de paquetes por código.
- 🔐 Autenticación segura con JWT.
- 🎨 Interfaz moderna y responsiva usando TailwindCSS y ShadCN.

## 🛠️ Tecnologías

| Frontend           | Backend           | Otros                     |
|--------------------|-------------------|---------------------------|
| React + Vite       | NestJS            | React Hook Form           |
| TypeScript         | REST API          | TailwindCSS, ShadCN       |
| ShadCN UI          | MySQL             | Lucide Icons              |
| React Router       | JWT               |                           |

## 🧑‍💻 Instalación

```bash
# Clona el repositorio
git clone https://github.com/javierLaris35/app-pmy.git
cd app-pmy

# Instala las dependencias
npm install

# Crea el archivo de variables de entorno
cp .env.example .env

# Inicia la aplicación
npm run dev
