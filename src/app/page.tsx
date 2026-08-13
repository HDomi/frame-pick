'use client'

import { AppHeader } from '@/components/layout/AppHeader'
import { EditorWorkspace } from '@/components/layout/EditorWorkspace'
import { FooterAd } from '@/components/layout/FooterAd'
import { GoogleFontsLoader } from '@/components/editor/GoogleFontsLoader'
import { CanvasProvider } from '@/contexts/CanvasContext'
import { EditorSessionProvider } from '@/contexts/EditorSessionContext'
import { AlertDialogProvider } from '@/contexts/AlertDialogContext'
import { LoadingProvider } from '@/contexts/LoadingContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { VideoSessionProvider } from '@/contexts/VideoSessionContext'

/**
 * 에디터 메인 셸 (헤더 + 워크스페이스 + 푸터)
 * @returns {React.ReactElement} - 에디터 페이지
 */
export default function HomePage() {
  return (
    <ToastProvider>
      <LoadingProvider>
        <AlertDialogProvider>
          <CanvasProvider>
            <EditorSessionProvider>
              <VideoSessionProvider>
                <div className="flex h-dvh min-w-0 flex-col overflow-hidden">
                  <GoogleFontsLoader />
                  <AppHeader />
                  <EditorWorkspace />
                  <FooterAd />
                </div>
              </VideoSessionProvider>
            </EditorSessionProvider>
          </CanvasProvider>
        </AlertDialogProvider>
      </LoadingProvider>
    </ToastProvider>
  )
}
