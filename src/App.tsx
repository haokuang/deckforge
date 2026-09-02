import { useStore } from './store'
import { TopBar } from './components/layout/TopBar'
import { LeftPanel } from './components/layout/LeftPanel'
import { PreviewArea } from './components/layout/PreviewArea'
import { RightPanel } from './components/layout/RightPanel'
import { FileDropZone } from './components/importer/FileDropZone'
import { ToastContainer } from './components/ui/ToastContainer'
import { SettingsModal } from './components/ui/SettingsModal'
import { RepositoryModal } from './components/ui/RepositoryModal'

function App() {
  const hasImported = useStore((s) => s.hasImported)

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden anim-fade-in">
      <TopBar />

      <main className="flex-1 flex overflow-hidden p-3 gap-3 relative">
        {hasImported ? (
          <div className="flex-1 flex overflow-hidden gap-3 anim-scale-in">
            <LeftPanel />
            <PreviewArea />
            <RightPanel />
          </div>
        ) : (
          <FileDropZone />
        )}
      </main>

      <ToastContainer />
      <SettingsModal />
      <RepositoryModal />
    </div>
  )
}

export default App
