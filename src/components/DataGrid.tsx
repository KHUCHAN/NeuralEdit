import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  SortingState,
  PaginationState,
} from '@tanstack/react-table';

interface DataGridProps {
  data: any[];
  title?: string;
}

const DataGrid = ({ data, title }: DataGridProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // 지원되는 페이지 사이즈 옵션
  const pageSizeOptions = [10, 25, 50, 100, 250];

  // 데이터가 비어있는 경우 처리
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-center py-8 text-gray-500">
          데이터가 없습니다.
        </div>
      </div>
    );
  }

  // 첫 번째 행이 올바른 객체인지 확인
  if (!data[0] || typeof data[0] !== 'object') {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-center py-8 text-gray-500">
          유효하지 않은 데이터 형식입니다.
        </div>
      </div>
    );
  }

  console.log('Rendering DataGrid with data:', data.length, 'rows');

  // 컬럼 생성
  const columnHelper = createColumnHelper<any>();
  const columns = useMemo(() => {
    const firstRow = data[0];
    // null 체크 추가
    if (!firstRow) return [];

    return Object.keys(firstRow).map(key => 
      columnHelper.accessor(key, {
        // 원본 키 이름을 헤더로 그대로 사용 (대소문자 유지)
        header: key,
        cell: info => {
          const value = info.getValue();
          if (value === null || value === undefined) return '-';
          return String(value);
        },
      })
    );
  }, [data]);

  // 테이블 설정
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // 페이지네이션 설정은 state로 관리
  });

  // 컬럼 헤더 드래그 시작 핸들러
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, columnName: string) => {
    // 정확한 원본 텍스트와 대소문자를 그대로 전달
    e.dataTransfer.setData('text', columnName);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // 페이지 크기 변경 핸들러
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);
    setPagination(prev => ({
      pageIndex: 0, // 페이지 크기 변경 시 첫 페이지로 이동
      pageSize: newSize,
    }));
  };

  // 처음/마지막 페이지로 이동 핸들러
  const goToFirstPage = () => table.setPageIndex(0);
  const goToLastPage = () => table.setPageIndex(table.getPageCount() - 1);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {title && (
        <div className="border-b border-gray-200 p-4">
          <h3 
            className="text-lg font-medium text-gray-900 cursor-pointer hover:text-primary-600"
            draggable
            onDragStart={(e) => handleDragStart(e, title)}
            title="드래그하여 쿼리 에디터에 테이블 이름 추가"
          >
            {title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            총 {data.length.toLocaleString()}개의 레코드
          </p>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div 
                      className="flex items-center space-x-1 group relative"
                      draggable
                      onDragStart={(e) => {
                        // 원본 텍스트 정확히 전달 (대소문자 변환 없이)
                        const headerText = String(header.column.columnDef.header);
                        handleDragStart(e, headerText);
                      }}
                    >
                      <span className="group-hover:text-primary-600">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </span>
                      <span>
                        {header.column.getIsSorted() ? (
                          header.column.getIsSorted() === 'asc' ? (
                            '↑'
                          ) : (
                            '↓'
                          )
                        ) : (
                          ''
                        )}
                      </span>
                      <span className="hidden group-hover:inline text-xs text-primary-500 ml-1">
                        (드래그 가능)
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            페이지{' '}
            <span className="font-medium">{table.getState().pagination.pageIndex + 1}</span> / {' '}
            <span className="font-medium">{table.getPageCount() || 1}</span>
          </span>
          
          <span className="text-sm text-gray-700 ml-4">
            총 {data.length.toLocaleString()}행 중{' '}
            {(table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1).toLocaleString()}-
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              data.length
            ).toLocaleString()}행 표시
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={table.getState().pagination.pageSize}
            onChange={handlePageSizeChange}
            className="text-sm border-gray-300 rounded-md px-2 py-1"
          >
            {pageSizeOptions.map(pageSize => (
              <option key={pageSize} value={pageSize}>
                {pageSize}행씩 보기
              </option>
            ))}
          </select>
          
          <button
            className="px-2 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
            onClick={goToFirstPage}
            disabled={!table.getCanPreviousPage()}
            title="첫 페이지"
          >
            ⟪
          </button>
          
          <button
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            이전
          </button>
          
          <button
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            다음
          </button>
          
          <button
            className="px-2 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
            onClick={goToLastPage}
            disabled={!table.getCanNextPage()}
            title="마지막 페이지"
          >
            ⟫
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataGrid; 