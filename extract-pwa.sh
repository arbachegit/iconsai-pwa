#!/bin/bash

# ============================================================
# KnowYOU PWA Extraction Script
# ============================================================
# Este script copia automaticamente os arquivos necessários
# do projeto knowyou-production para um novo projeto knowyou-pwa
# ============================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SOURCE_DIR="$(pwd)"
TARGET_DIR="../knowyou-pwa"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  KnowYOU PWA Extraction Script${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "${YELLOW}Source:${NC} $SOURCE_DIR"
echo -e "${YELLOW}Target:${NC} $TARGET_DIR"
echo ""

# Check if we're in the right directory
if [ ! -f "PWA-EXTRACTION-GUIDE.md" ]; then
    echo -e "${RED}Error: PWA-EXTRACTION-GUIDE.md not found!${NC}"
    echo -e "${RED}Please run this script from the knowyou-production directory.${NC}"
    exit 1
fi

# Check if target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${RED}Error: Target directory $TARGET_DIR does not exist!${NC}"
    echo -e "${YELLOW}Please create it first with:${NC}"
    echo -e "${BLUE}  cd ..${NC}"
    echo -e "${BLUE}  npm create vite@latest knowyou-pwa -- --template react-swc-ts${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Validation passed${NC}"
echo ""

# Function to copy files with logging
copy_file() {
    local src="$1"
    local dest="$2"

    if [ -f "$src" ]; then
        mkdir -p "$(dirname "$dest")"
        cp "$src" "$dest"
        echo -e "${GREEN}✓${NC} Copied: $src"
    else
        echo -e "${YELLOW}⚠${NC} Skipped (not found): $src"
    fi
}

# Function to copy directory
copy_dir() {
    local src="$1"
    local dest="$2"

    if [ -d "$src" ]; then
        mkdir -p "$(dirname "$dest")"
        cp -r "$src" "$dest"
        echo -e "${GREEN}✓${NC} Copied directory: $src"
    else
        echo -e "${YELLOW}⚠${NC} Skipped (not found): $src"
    fi
}

# Create directory structure
echo -e "${BLUE}Creating directory structure...${NC}"
mkdir -p "$TARGET_DIR/src/components/pwa/voice"
mkdir -p "$TARGET_DIR/src/components/pwa/modules"
mkdir -p "$TARGET_DIR/src/components/pwa/containers"
mkdir -p "$TARGET_DIR/src/components/pwa/history"
mkdir -p "$TARGET_DIR/src/components/pwa/microphone"
mkdir -p "$TARGET_DIR/src/components/pwa/microservices"
mkdir -p "$TARGET_DIR/src/components/gates"
mkdir -p "$TARGET_DIR/src/components/ui"
mkdir -p "$TARGET_DIR/src/hooks"
mkdir -p "$TARGET_DIR/src/stores"
mkdir -p "$TARGET_DIR/src/utils"
mkdir -p "$TARGET_DIR/src/lib"
mkdir -p "$TARGET_DIR/src/integrations/supabase"
mkdir -p "$TARGET_DIR/src/types"
mkdir -p "$TARGET_DIR/supabase/functions"
echo -e "${GREEN}✓ Directory structure created${NC}"
echo ""

# Copy PWA Components
echo -e "${BLUE}Copying PWA components...${NC}"

# Voice components
copy_dir "$SOURCE_DIR/src/components/pwa/voice" "$TARGET_DIR/src/components/pwa/voice"

# Module components
copy_dir "$SOURCE_DIR/src/components/pwa/modules" "$TARGET_DIR/src/components/pwa/modules"

# Container components
copy_dir "$SOURCE_DIR/src/components/pwa/containers" "$TARGET_DIR/src/components/pwa/containers"

# History components
copy_dir "$SOURCE_DIR/src/components/pwa/history" "$TARGET_DIR/src/components/pwa/history"

# Microphone components
copy_dir "$SOURCE_DIR/src/components/pwa/microphone" "$TARGET_DIR/src/components/pwa/microphone"

# Microservices components
copy_dir "$SOURCE_DIR/src/components/pwa/microservices" "$TARGET_DIR/src/components/pwa/microservices"

# Root PWA files
copy_file "$SOURCE_DIR/src/components/pwa/MobileFrame.tsx" "$TARGET_DIR/src/components/pwa/MobileFrame.tsx"
copy_file "$SOURCE_DIR/src/components/pwa/SafariAudioUnlock.tsx" "$TARGET_DIR/src/components/pwa/SafariAudioUnlock.tsx"
copy_file "$SOURCE_DIR/src/components/pwa/SafariPWAInstallPrompt.tsx" "$TARGET_DIR/src/components/pwa/SafariPWAInstallPrompt.tsx"
copy_file "$SOURCE_DIR/src/components/pwa/VoiceSpectrum.tsx" "$TARGET_DIR/src/components/pwa/VoiceSpectrum.tsx"
copy_file "$SOURCE_DIR/src/components/pwa/types.ts" "$TARGET_DIR/src/components/pwa/types.ts"
copy_file "$SOURCE_DIR/src/components/pwa/index.ts" "$TARGET_DIR/src/components/pwa/index.ts"

echo ""

# Copy Gates
echo -e "${BLUE}Copying gates...${NC}"
copy_file "$SOURCE_DIR/src/components/gates/PWAAuthGate.tsx" "$TARGET_DIR/src/components/gates/PWAAuthGate.tsx"
copy_file "$SOURCE_DIR/src/components/gates/DeviceGate.tsx" "$TARGET_DIR/src/components/gates/DeviceGate.tsx"
copy_file "$SOURCE_DIR/src/components/gates/index.ts" "$TARGET_DIR/src/components/gates/index.ts"
echo ""

# Copy UI Components (will be overwritten by shadcn-ui, but copy as backup)
echo -e "${BLUE}Copying UI components (Shadcn)...${NC}"
copy_dir "$SOURCE_DIR/src/components/ui" "$TARGET_DIR/src/components/ui"
echo ""

# Copy Hooks
echo -e "${BLUE}Copying hooks...${NC}"
copy_file "$SOURCE_DIR/src/hooks/usePWAAuth.ts" "$TARGET_DIR/src/hooks/usePWAAuth.ts"
copy_file "$SOURCE_DIR/src/hooks/useConfigPWA.ts" "$TARGET_DIR/src/hooks/useConfigPWA.ts"
copy_file "$SOURCE_DIR/src/hooks/usePWAConversations.ts" "$TARGET_DIR/src/hooks/usePWAConversations.ts"
copy_file "$SOURCE_DIR/src/hooks/useDeviceFingerprint.ts" "$TARGET_DIR/src/hooks/useDeviceFingerprint.ts"
copy_file "$SOURCE_DIR/src/hooks/useDeviceDetection.ts" "$TARGET_DIR/src/hooks/useDeviceDetection.ts"
copy_file "$SOURCE_DIR/src/hooks/useDeviceFingerprintAdapter.ts" "$TARGET_DIR/src/hooks/useDeviceFingerprintAdapter.ts"
copy_file "$SOURCE_DIR/src/hooks/use-toast.ts" "$TARGET_DIR/src/hooks/use-toast.ts"
copy_file "$SOURCE_DIR/src/hooks/use-mobile.ts" "$TARGET_DIR/src/hooks/use-mobile.ts"
echo ""

# Copy Stores
echo -e "${BLUE}Copying stores...${NC}"
copy_file "$SOURCE_DIR/src/stores/pwaVoiceStore.ts" "$TARGET_DIR/src/stores/pwaVoiceStore.ts"
copy_file "$SOURCE_DIR/src/stores/historyStore.ts" "$TARGET_DIR/src/stores/historyStore.ts"
copy_file "$SOURCE_DIR/src/stores/audioManagerStore.ts" "$TARGET_DIR/src/stores/audioManagerStore.ts"
echo ""

# Copy Utils
echo -e "${BLUE}Copying utilities...${NC}"
copy_file "$SOURCE_DIR/src/utils/safari-audio.ts" "$TARGET_DIR/src/utils/safari-audio.ts"
copy_file "$SOURCE_DIR/src/utils/safari-detect.ts" "$TARGET_DIR/src/utils/safari-detect.ts"
copy_file "$SOURCE_DIR/src/utils/cn.ts" "$TARGET_DIR/src/utils/cn.ts"
echo ""

# Copy Lib
echo -e "${BLUE}Copying libraries...${NC}"
copy_file "$SOURCE_DIR/src/lib/security-shield.ts" "$TARGET_DIR/src/lib/security-shield.ts"
echo ""

# Copy Supabase Integration
echo -e "${BLUE}Copying Supabase integration...${NC}"
copy_file "$SOURCE_DIR/src/integrations/supabase/client.ts" "$TARGET_DIR/src/integrations/supabase/client.ts"
copy_file "$SOURCE_DIR/src/integrations/supabase/types.ts" "$TARGET_DIR/src/integrations/supabase/types.ts"
echo ""

# Copy Edge Functions
echo -e "${BLUE}Copying Edge Functions...${NC}"
copy_dir "$SOURCE_DIR/supabase/functions/chat-router" "$TARGET_DIR/supabase/functions/chat-router"
copy_dir "$SOURCE_DIR/supabase/functions/text-to-speech" "$TARGET_DIR/supabase/functions/text-to-speech"
copy_dir "$SOURCE_DIR/supabase/functions/voice-to-text" "$TARGET_DIR/supabase/functions/voice-to-text"
copy_dir "$SOURCE_DIR/supabase/functions/send-sms" "$TARGET_DIR/supabase/functions/send-sms"
copy_dir "$SOURCE_DIR/supabase/functions/send-whatsapp" "$TARGET_DIR/supabase/functions/send-whatsapp"
copy_dir "$SOURCE_DIR/supabase/functions/pwa-save-message" "$TARGET_DIR/supabase/functions/pwa-save-message"
copy_dir "$SOURCE_DIR/supabase/functions/pwa-get-history" "$TARGET_DIR/supabase/functions/pwa-get-history"
copy_dir "$SOURCE_DIR/supabase/functions/pwa-contextual-memory" "$TARGET_DIR/supabase/functions/pwa-contextual-memory"
copy_dir "$SOURCE_DIR/supabase/functions/generate-contextual-greeting" "$TARGET_DIR/supabase/functions/generate-contextual-greeting"
copy_dir "$SOURCE_DIR/supabase/functions/check-ban-status" "$TARGET_DIR/supabase/functions/check-ban-status"
copy_dir "$SOURCE_DIR/supabase/functions/report-security-violation" "$TARGET_DIR/supabase/functions/report-security-violation"
echo ""

# Copy config files
echo -e "${BLUE}Copying configuration files...${NC}"
copy_file "$SOURCE_DIR/tailwind.config.ts" "$TARGET_DIR/tailwind.config.ts"
copy_file "$SOURCE_DIR/components.json" "$TARGET_DIR/components.json"
copy_file "$SOURCE_DIR/postcss.config.js" "$TARGET_DIR/postcss.config.js"
copy_file "$SOURCE_DIR/tsconfig.json" "$TARGET_DIR/tsconfig.json"
copy_file "$SOURCE_DIR/tsconfig.app.json" "$TARGET_DIR/tsconfig.app.json"
copy_file "$SOURCE_DIR/tsconfig.node.json" "$TARGET_DIR/tsconfig.node.json"
copy_file "$SOURCE_DIR/vite.config.ts" "$TARGET_DIR/vite.config.ts"
echo ""

# Copy index.css (global styles)
echo -e "${BLUE}Copying global styles...${NC}"
copy_file "$SOURCE_DIR/src/index.css" "$TARGET_DIR/src/index.css"
echo ""

# Copy documentation
echo -e "${BLUE}Copying documentation...${NC}"
copy_file "$SOURCE_DIR/PWA-EXTRACTION-GUIDE.md" "$TARGET_DIR/PWA-EXTRACTION-GUIDE.md"
copy_file "$SOURCE_DIR/README-PWA.md" "$TARGET_DIR/README.md"
echo ""

# Copy package.json
echo -e "${BLUE}Copying package.json...${NC}"
copy_file "$SOURCE_DIR/PWA-package.json" "$TARGET_DIR/package.json"
echo ""

# Summary
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  ✓ Extraction Complete!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo -e "${BLUE}1.${NC} Navigate to the new project:"
echo -e "   ${BLUE}cd $TARGET_DIR${NC}"
echo ""
echo -e "${BLUE}2.${NC} Install dependencies:"
echo -e "   ${BLUE}npm install${NC}"
echo ""
echo -e "${BLUE}3.${NC} Configure environment variables:"
echo -e "   ${BLUE}cp .env.example .env${NC}"
echo -e "   Edit .env with your Supabase credentials"
echo ""
echo -e "${BLUE}4.${NC} Create App.tsx (see README.md for template)"
echo ""
echo -e "${BLUE}5.${NC} Setup Supabase:"
echo -e "   - Create tables (see PWA-EXTRACTION-GUIDE.md section 9)"
echo -e "   - Create RPC functions (section 10)"
echo -e "   - Deploy Edge Functions"
echo ""
echo -e "${BLUE}6.${NC} Start development server:"
echo -e "   ${BLUE}npm run dev${NC}"
echo ""
echo -e "${YELLOW}For detailed instructions, see:${NC}"
echo -e "   ${BLUE}README.md${NC} (quick start)"
echo -e "   ${BLUE}PWA-EXTRACTION-GUIDE.md${NC} (comprehensive guide)"
echo ""
echo -e "${GREEN}Good luck! 🚀${NC}"
