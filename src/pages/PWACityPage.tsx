/**
 * ============================================================
 * PWACityPage.tsx - Página principal do PWA City
 * ============================================================
 * Versão: 1.1.0
 * Data: 2026-01-17
 *
 * Descrição: Página principal do PWA City (microserviço).
 * Integra autenticação, device gate e container principal.
 * Com MobileFrame para visualização desktop.
 * ============================================================
 */

import React from "react";
import PWACityDeviceGate from "@/components/gates/PWACityDeviceGate";
import { PWACityAuthGate } from "@/components/gates/PWACityAuthGate";
import { PWACityContainer } from "@/components/pwacity/PWACityContainer";
import { MobileFrame } from "@/components/pwa/MobileFrame";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";

const PWACityPage: React.FC = () => {
  const { isDesktop } = useDeviceDetection();

  // Se for desktop, envolver com MobileFrame
  if (isDesktop) {
    return (
      <MobileFrame>
        <PWACityDeviceGate>
          <PWACityAuthGate>
            {({ userName, userPhone, sessionId, logout }) => (
              <PWACityContainer
                userName={userName}
                userPhone={userPhone}
                sessionId={sessionId}
                onLogout={logout}
              />
            )}
          </PWACityAuthGate>
        </PWACityDeviceGate>
      </MobileFrame>
    );
  }

  // Mobile: sem MobileFrame
  return (
    <PWACityDeviceGate>
      <PWACityAuthGate>
        {({ userName, userPhone, sessionId, logout }) => (
          <PWACityContainer
            userName={userName}
            userPhone={userPhone}
            sessionId={sessionId}
            onLogout={logout}
          />
        )}
      </PWACityAuthGate>
    </PWACityDeviceGate>
  );
};

export default PWACityPage;
