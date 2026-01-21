import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Stethoscope, MapPin, Hospital,
  Volume2, VolumeX, MessageCircle, ChevronRight, ChevronDown,
  Clock, Star, CheckCircle2, AlertCircle, Mic, MicOff,
  Send, Copy, Phone, Navigation, Loader2
} from "lucide-react";
import { useVoiceNarration } from "@/hooks/useVoiceNarration";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Types
type Severity = "low" | "medium" | "high";
type HospitalType = "public" | "private" | "upa";
type ActiveTab = "symptoms" | "hospitals";

interface SymptomTranslation {
  id: string;
  popular: string;
  medical: string;
  category: string;
  severity: Severity;
  relatedConditions: string[];
}

interface HospitalData {
  id: string;
  name: string;
  type: HospitalType;
  distance: number;
  waitTime: number;
  rating: number;
  acceptsInsurance: string[];
  specialties: string[];
  address: string;
}

interface UserProfile {
  insurance: string;
  chronicConditions: string[];
  allergies: string[];
  lastVisit: string;
}

// Data
const symptomTranslations: SymptomTranslation[] = [
  {
    id: "s1",
    popular: "Dor de cabeça forte que não passa",
    medical: "Cefaleia persistente / Cefaleia tensional",
    category: "Neurológico",
    severity: "medium",
    relatedConditions: ["Enxaqueca", "Tensão muscular", "Sinusite"]
  },
  {
    id: "s2",
    popular: "Dor no peito quando respiro",
    medical: "Dor torácica pleurítica / Pleurodinia",
    category: "Respiratório",
    severity: "high",
    relatedConditions: ["Pleurite", "Pneumonia", "Costocondrite"]
  },
  {
    id: "s3",
    popular: "Barriga inchada e doendo",
    medical: "Distensão abdominal com dor / Meteorismo",
    category: "Gastrointestinal",
    severity: "low",
    relatedConditions: ["Síndrome do intestino irritável", "Gastrite", "Intolerância alimentar"]
  },
  {
    id: "s4",
    popular: "Tontura quando levanto",
    medical: "Hipotensão ortostática / Vertigem postural",
    category: "Cardiovascular",
    severity: "medium",
    relatedConditions: ["Hipotensão", "Desidratação", "Anemia"]
  },
  {
    id: "s5",
    popular: "Falta de ar subindo escada",
    medical: "Dispneia aos esforços",
    category: "Respiratório",
    severity: "medium",
    relatedConditions: ["Asma", "Anemia", "Condicionamento físico"]
  }
];

const nearbyHospitals: HospitalData[] = [
  {
    id: "h1",
    name: "Hospital Moinhos de Vento",
    type: "private",
    distance: 2.3,
    waitTime: 15,
    rating: 4.8,
    acceptsInsurance: ["Unimed", "Bradesco Saúde", "SulAmérica", "Particular"],
    specialties: ["Cardiologia", "Neurologia", "Ortopedia", "Oncologia"],
    address: "Rua Ramiro Barcelos, 910"
  },
  {
    id: "h2",
    name: "UPA 24h Centro",
    type: "upa",
    distance: 1.1,
    waitTime: 45,
    rating: 3.9,
    acceptsInsurance: ["SUS"],
    specialties: ["Urgência", "Emergência", "Clínica Geral"],
    address: "Av. Independência, 750"
  },
  {
    id: "h3",
    name: "Hospital de Clínicas",
    type: "public",
    distance: 3.5,
    waitTime: 90,
    rating: 4.2,
    acceptsInsurance: ["SUS", "Planos conveniados"],
    specialties: ["Todas as especialidades"],
    address: "Rua Ramiro Barcelos, 2350"
  }
];

const userProfile: UserProfile = {
  insurance: "Unimed",
  chronicConditions: ["Hipertensão"],
  allergies: ["Dipirona"],
  lastVisit: "2025-01-15"
};

// Color configs
const severityColors: Record<Severity, { bg: string; text: string; label: string }> = {
  low: { bg: "bg-green-500/20", text: "text-green-400", label: "Baixa" },
  medium: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Média" },
  high: { bg: "bg-red-500/20", text: "text-red-400", label: "Alta" }
};

const hospitalTypeConfig: Record<HospitalType, { label: string; color: string; bg: string }> = {
  public: { label: "Público", color: "text-blue-400", bg: "bg-blue-500/20" },
  private: { label: "Privado", color: "text-purple-400", bg: "bg-purple-500/20" },
  upa: { label: "UPA 24h", color: "text-rose-400", bg: "bg-rose-500/20" }
};

// Sub-components
const SymptomTranslator: React.FC = () => {
  const [symptomInput, setSymptomInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [suggestions, setSuggestions] = useState<SymptomTranslation[]>([]);
  const [selectedSymptom, setSelectedSymptom] = useState<SymptomTranslation | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (symptomInput.length >= 3) {
      const filtered = symptomTranslations.filter(s =>
        s.popular.toLowerCase().includes(symptomInput.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [symptomInput]);

  const handleMicClick = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setSymptomInput("Dor de cabeça forte que não passa");
    }, 2000);
  };

  const handleSelectSuggestion = (symptom: SymptomTranslation) => {
    setSelectedSymptom(symptom);
    setSymptomInput(symptom.popular);
    setShowSuggestions(false);
  };

  const handleSend = () => {
    const found = symptomTranslations.find(s =>
      s.popular.toLowerCase() === symptomInput.toLowerCase()
    );
    if (found) {
      setSelectedSymptom(found);
    } else if (symptomInput.length > 0) {
      toast.info("Sintoma não encontrado na base. Tente descrever de outra forma.");
    }
  };

  const handleCopy = () => {
    if (selectedSymptom) {
      navigator.clipboard.writeText(
        `Sintoma: ${selectedSymptom.popular}\nTradução médica: ${selectedSymptom.medical}\nCategoria: ${selectedSymptom.category}`
      );
      toast.success("Tradução copiada para a área de transferência!");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Input Area */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              value={symptomInput}
              onChange={(e) => setSymptomInput(e.target.value)}
              placeholder="Descreva o que você está sentindo com suas palavras..."
              className="min-h-[100px] bg-gray-800/50 border-gray-700 resize-none pr-20"
            />
            <div className="absolute right-2 bottom-2 flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8",
                      isRecording && "bg-red-500/20 text-red-400"
                    )}
                    onClick={handleMicClick}
                  >
                    {isRecording ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        <MicOff className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isRecording ? "Gravando..." : "Gravar sintoma"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleSend}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Traduzir sintoma</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-10 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
            >
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  className="w-full p-3 text-left hover:bg-gray-700/50 transition-colors border-b border-gray-700/50 last:border-0"
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{suggestion.popular}</span>
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </div>
                  <span className="text-xs text-rose-400">{suggestion.medical}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Translation Result */}
      <AnimatePresence>
        {selectedSymptom && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-rose-950/30 border border-rose-800/50 rounded-xl p-4 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-500/20 rounded-lg">
                <Stethoscope className="h-6 w-6 text-rose-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">Tradução Médica</h3>
                  <Badge className={cn(
                    severityColors[selectedSymptom.severity].bg,
                    severityColors[selectedSymptom.severity].text,
                    "text-xs"
                  )}>
                    Severidade: {severityColors[selectedSymptom.severity].label}
                  </Badge>
                </div>
                <p className="text-sm text-gray-400 mb-2">
                  Você disse: <span className="text-gray-300">"{selectedSymptom.popular}"</span>
                </p>
                <p className="text-lg font-medium text-rose-300 mb-3">
                  {selectedSymptom.medical}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                    {selectedSymptom.category}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Condições relacionadas:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSymptom.relatedConditions.map((condition) => (
                      <Badge
                        key={condition}
                        variant="secondary"
                        className="bg-gray-700/50 text-gray-300 text-xs"
                      >
                        {condition}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-rose-700/50 text-rose-300 hover:bg-rose-900/30"
              onClick={handleCopy}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar para mostrar ao médico
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const HospitalFinder: React.FC = () => {
  const [filter, setFilter] = useState<"all" | HospitalType>("all");
  const [expandedHospital, setExpandedHospital] = useState<string | null>(null);

  const filteredHospitals = filter === "all"
    ? nearbyHospitals
    : nearbyHospitals.filter(h => h.type === filter);

  const acceptsUserInsurance = (hospital: HospitalData) =>
    hospital.acceptsInsurance.some(ins =>
      ins.toLowerCase().includes(userProfile.insurance.toLowerCase())
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* User Profile Card */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <span className="text-gray-300">Plano:</span>
          <Badge className="bg-green-500/20 text-green-400">{userProfile.insurance}</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "public", "private", "upa"] as const).map((type) => (
          <Button
            key={type}
            variant={filter === type ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(type)}
            className={cn(
              filter === type && "bg-rose-600 hover:bg-rose-700",
              filter !== type && "border-gray-700 text-gray-400 hover:text-white"
            )}
          >
            {type === "all" ? "Todos" : hospitalTypeConfig[type].label}
          </Button>
        ))}
      </div>

      {/* Hospital List */}
      <div className="space-y-3">
        {filteredHospitals.map((hospital) => {
          const isExpanded = expandedHospital === hospital.id;
          const typeConfig = hospitalTypeConfig[hospital.type];
          const hasInsurance = acceptsUserInsurance(hospital);

          return (
            <motion.div
              key={hospital.id}
              layout
              className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden"
            >
              <button
                className="w-full p-4 text-left"
                onClick={() => setExpandedHospital(isExpanded ? null : hospital.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
                    <Hospital className={cn("h-5 w-5", typeConfig.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-white truncate">{hospital.name}</h3>
                      <Badge className={cn(typeConfig.bg, typeConfig.color, "text-xs")}>
                        {typeConfig.label}
                      </Badge>
                      {hasInsurance && (
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          Aceita seu plano
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        {hospital.rating}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {hospital.distance} km
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ~{hospital.waitTime} min
                      </span>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  </motion.div>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-0 space-y-3 border-t border-gray-700/50">
                      {/* Address */}
                      <div className="flex items-center gap-2 text-sm text-gray-400 pt-3">
                        <MapPin className="h-4 w-4 text-rose-400" />
                        {hospital.address}
                      </div>

                      {/* Specialties */}
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Especialidades:</p>
                        <div className="flex flex-wrap gap-1">
                          {hospital.specialties.map((spec) => (
                            <Badge
                              key={spec}
                              variant="outline"
                              className="border-gray-600 text-gray-400 text-xs"
                            >
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Insurance */}
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Planos aceitos:</p>
                        <div className="flex flex-wrap gap-1">
                          {hospital.acceptsInsurance.map((ins) => (
                            <Badge
                              key={ins}
                              className={cn(
                                "text-xs",
                                ins.toLowerCase().includes(userProfile.insurance.toLowerCase())
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-gray-700/50 text-gray-400"
                              )}
                            >
                              {ins}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-gray-700 text-gray-300"
                          onClick={() => toast.info("Abrindo navegação...")}
                        >
                          <Navigation className="h-4 w-4 mr-2" />
                          Como Chegar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-gray-700 text-gray-300"
                          onClick={() => toast.info("Iniciando ligação...")}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Ligar
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// Main Component
export const HealthCareDiagram: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("symptoms");
  
  // Voice narration hook
  const { isLoading: isNarrationLoading, isPlaying: isNarrationPlaying, play: playNarration, stop: stopNarration } = useVoiceNarration("healthcare");

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-rose-950/10 to-slate-950 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-900/70 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Heart className="w-8 h-8 text-rose-500 fill-rose-500/30" />
            </motion.div>
            <div>
              <h2 className="text-xl font-bold text-white">HealthCare</h2>
              <p className="text-xs text-gray-400">Sua companheira de saúde inteligente</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => isNarrationPlaying ? stopNarration() : playNarration()}
                  className="text-gray-400 hover:text-white"
                  disabled={isNarrationLoading}
                >
                  {isNarrationLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isNarrationPlaying ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isNarrationLoading ? "Carregando..." : isNarrationPlaying ? "Parar narração" : "Ouvir narração"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-green-400">
                  <MessageCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>WhatsApp</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b border-gray-700">
          <Button
            variant={activeTab === "symptoms" ? "default" : "ghost"}
            onClick={() => setActiveTab("symptoms")}
            className={cn(
              "flex-1",
              activeTab === "symptoms" && "bg-rose-600 hover:bg-rose-700"
            )}
          >
            <Stethoscope className="w-4 h-4 mr-2" />
            Tradutor de Sintomas
          </Button>
          <Button
            variant={activeTab === "hospitals" ? "default" : "ghost"}
            onClick={() => setActiveTab("hospitals")}
            className={cn(
              "flex-1",
              activeTab === "hospitals" && "bg-rose-600 hover:bg-rose-700"
            )}
          >
            <Hospital className="w-4 h-4 mr-2" />
            Encontrar Hospital
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {activeTab === "symptoms" ? (
              <SymptomTranslator key="symptoms" />
            ) : (
              <HospitalFinder key="hospitals" />
            )}
          </AnimatePresence>
        </div>

        {/* Emergency Footer */}
        <div className="p-4 bg-red-950/30 border-t border-red-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-300">
                Em caso de emergência, ligue 192 (SAMU)
              </p>
              <p className="text-xs text-red-400/70">
                Este app não substitui atendimento médico profissional
              </p>
            </div>
          </div>

          <Button
            variant="destructive"
            size="sm"
            className="bg-red-600 hover:bg-red-700 flex-shrink-0"
            onClick={() => toast.info("Ligando para 192...")}
          >
            192
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default HealthCareDiagram;
