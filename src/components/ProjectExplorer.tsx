import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface ProjectExplorerProps {
  onFileSelected: (file: File) => void;
}

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: FileNode[];
  isExpanded?: boolean;
  level: number;
}

// FileSystemDirectoryHandle 인터페이스 확장
interface EnhancedFileSystemDirectoryHandle extends FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
}

// Window 인터페이스 확장
declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  }
}

const ProjectExplorer = ({ onFileSelected }: ProjectExplorerProps) => {
  const [rootDirectory, setRootDirectory] = useState<FileSystemDirectoryHandle | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApiSupported, setIsApiSupported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 브라우저 지원 확인
  useEffect(() => {
    // File System Access API 지원 확인
    if (typeof window !== 'undefined' && window.showDirectoryPicker) {
      setIsApiSupported(true);
    } else {
      setIsApiSupported(false);
      setError('현재 브라우저는 폴더 탐색 기능을 지원하지 않습니다. Chrome 또는 Edge 브라우저를 사용해주세요.');
    }
  }, []);

  // 파일 업로드 대체 방법
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      onFileSelected(file);
    }
  };

  // 파일 트리 구축 함수
  const buildFileTree = async (
    directoryHandle: FileSystemDirectoryHandle,
    path = '',
    level = 0
  ): Promise<FileNode[]> => {
    const entries: FileNode[] = [];
    
    try {
      // 디렉토리 내의 모든 항목 반복
      for await (const [name, handle] of (directoryHandle as EnhancedFileSystemDirectoryHandle).entries()) {
        const entryPath = path ? `${path}/${name}` : name;
        
        if (handle.kind === 'directory') {
          // 디렉토리인 경우 재귀적으로 처리
          const children = await buildFileTree(handle as FileSystemDirectoryHandle, entryPath, level + 1);
          entries.push({
            name,
            path: entryPath,
            isDirectory: true,
            children,
            isExpanded: false,
            level
          });
        } else if (handle.kind === 'file') {
          // 파일 확장자 확인
          const extension = name.split('.').pop()?.toLowerCase();
          // 지원하는 파일 형식만 표시 (엑셀, CSV, DAT)
          if (['xlsx', 'xls', 'csv', 'dat'].includes(extension || '')) {
            entries.push({
              name,
              path: entryPath,
              isDirectory: false,
              children: [],
              level
            });
          }
        }
      }
    } catch (err) {
      console.error('Error building file tree:', err);
    }
    
    // 이름으로 정렬 (폴더 먼저, 그 다음 파일)
    return entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  // 폴더 선택 처리
  const handleSelectFolder = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // File System Access API 지원 확인
      if (!window.showDirectoryPicker) {
        setError('현재 브라우저는 폴더 탐색 기능을 지원하지 않습니다. Chrome 또는 Edge 브라우저를 사용해주세요.');
        setIsLoading(false);
        return;
      }
      
      // 폴더 선택 대화상자 열기
      const directoryHandle = await window.showDirectoryPicker();
      setRootDirectory(directoryHandle);
      
      // 파일 트리 구축
      const tree = await buildFileTree(directoryHandle);
      setFileTree(tree);
    } catch (err) {
      console.error('Error selecting folder:', err);
      if ((err as Error).name === 'AbortError') {
        // 사용자가 취소한 경우
        setError(null);
      } else {
        setError('폴더를 열 수 없습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 파일 노드 클릭 처리
  const handleFileClick = async (node: FileNode) => {
    if (node.isDirectory || !rootDirectory) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // 파일 경로를 파싱하여 핸들 찾기
      const pathParts = node.path.split('/');
      let currentHandle: FileSystemDirectoryHandle = rootDirectory;
      
      // 마지막 부분(파일 이름)을 제외한 경로 순회
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
      }
      
      // 파일 핸들 가져오기
      const fileHandle = await currentHandle.getFileHandle(pathParts[pathParts.length - 1]);
      const file = await fileHandle.getFile();
      
      // 부모 컴포넌트에 파일 전달
      onFileSelected(file);
    } catch (err) {
      console.error('Error opening file:', err);
      setError('파일을 열 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 폴더 토글 (확장/축소)
  const toggleFolder = (path: string) => {
    setFileTree(prevTree => {
      const updateNode = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.path === path) {
            return { ...node, isExpanded: !node.isExpanded };
          } else if (node.isDirectory) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      
      return updateNode(prevTree);
    });
  };

  // 파일 트리 렌더링 함수
  const renderFileTree = (nodes: FileNode[]) => {
    return nodes.map(node => (
      <div key={node.path} style={{ marginLeft: `${node.level * 16}px` }}>
        <div 
          className={`flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer ${
            node.isDirectory ? 'font-medium' : ''
          }`}
          onClick={() => node.isDirectory ? toggleFolder(node.path) : handleFileClick(node)}
        >
          {node.isDirectory ? (
            <span className="mr-1">{node.isExpanded ? '📂' : '📁'}</span>
          ) : (
            <span className="mr-1">
              {node.name.endsWith('.xlsx') || node.name.endsWith('.xls') 
                ? '📊' 
                : node.name.endsWith('.csv') 
                  ? '📝' 
                  : node.name.endsWith('.dat') 
                    ? '📄'
                    : '📄'}
            </span>
          )}
          <span className="truncate text-sm">{node.name}</span>
        </div>
        
        {node.isDirectory && node.isExpanded && (
          <div className="ml-2">
            {renderFileTree(node.children)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 h-full">
      <h2 className="text-lg font-semibold mb-4">프로젝트 탐색기</h2>
      
      {isApiSupported ? (
        <button
          className="w-full py-2 px-4 mb-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg flex items-center justify-center"
          onClick={handleSelectFolder}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full mr-2"></div>
          ) : (
            <span className="mr-2">📁</span>
          )}
          폴더 열기
        </button>
      ) : (
        <div className="mb-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv,.dat"
            className="hidden"
          />
          <button
            className="w-full py-2 px-4 mb-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg flex items-center justify-center"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="mr-2">📄</span>
            파일 선택
          </button>
          <p className="text-xs text-gray-500 text-center">폴더 탐색이 지원되지 않습니다. 파일을 직접 선택해주세요.</p>
        </div>
      )}
      
      {error && (
        <div className="text-red-500 text-sm mb-3">{error}</div>
      )}
      
      <div className="border border-gray-200 rounded-lg p-2 h-[calc(100%-7rem)] overflow-auto">
        {fileTree.length > 0 ? (
          <div className="text-sm">
            <div className="font-medium mb-2 px-2 py-1 bg-gray-50 rounded">
              {rootDirectory?.name || '루트 폴더'}
            </div>
            {renderFileTree(fileTree)}
          </div>
        ) : (
          <div className="text-gray-500 text-sm text-center p-4">
            {isLoading ? '폴더를 불러오는 중...' : '폴더를 열어 Excel, CSV, DAT 파일을 탐색하세요'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectExplorer; 