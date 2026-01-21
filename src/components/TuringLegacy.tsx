import { useTranslation } from "react-i18next";

const TuringLegacy = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-10 relative">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent">
          {t("turingLegacy.title")}
        </h2>
        
        <blockquote className="max-w-4xl mx-auto">
          <p className="text-2xl md:text-3xl italic bg-gradient-to-r from-cyan-400 via-green-400 to-yellow-400 bg-clip-text text-transparent leading-relaxed">
            "{t("turingLegacy.quote")}"
          </p>
          <footer className="mt-6 text-lg text-muted-foreground">
            {t("turingLegacy.author")}
          </footer>
        </blockquote>
      </div>
    </section>
  );
};

export default TuringLegacy;
