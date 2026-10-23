import logo from "../assets/logo-sistema.png";
import "../styles/logoSistema.css";

// A marca acompanha um título visível, evitando repetir seu nome no leitor de tela.
export default function LogoSistema({ className = "" }: { className?: string }) {
  return (
    <img
      src={logo}
      className={`logo-sistema ${className}`.trim()}
      alt=""
      aria-hidden="true"
      width={40}
      height={40}
    />
  );
}
