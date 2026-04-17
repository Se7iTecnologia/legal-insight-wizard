import setiLogo from "@/assets/seti-logo.png";

export function AppFooter() {
  return (
    <footer className="mt-10 pt-6 border-t border-border">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <p className="text-center sm:text-left">
          © {new Date().getFullYear()} Todos os direitos reservados.
        </p>
        <a
          href="https://se7itecnologia.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:text-foreground transition-colors group"
        >
          <span>
            Desenvolvido por{" "}
            <span className="font-semibold text-foreground group-hover:underline">
              Seti Tecnologia LTDA
            </span>{" "}
            · CNPJ: 19.617.014/0001-87
          </span>
          <img
            src={setiLogo}
            alt="Seti Tecnologia"
            className="h-6 w-auto opacity-80 group-hover:opacity-100 transition-opacity"
          />
        </a>
      </div>
    </footer>
  );
}
