import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

type MonacoWorkerFactory = new () => Worker

type MonacoEnvironmentShape = {
  getWorker: (_moduleId: string, label: string) => Worker
}

const workerFactories: Record<string, MonacoWorkerFactory> = {
  json: jsonWorker,
  css: cssWorker,
  scss: cssWorker,
  less: cssWorker,
  html: htmlWorker,
  handlebars: htmlWorker,
  razor: htmlWorker,
  typescript: tsWorker,
  javascript: tsWorker,
}

export function configureMonacoWorkers() {
  const globalScope = self as typeof self & { MonacoEnvironment?: MonacoEnvironmentShape }

  globalScope.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
      const WorkerFactory = workerFactories[label] ?? editorWorker
      return new WorkerFactory()
    },
  }
}
