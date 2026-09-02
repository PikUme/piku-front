import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Profiler } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getFixedCharacters } from '@/lib/api/character';
import AiCharacterSelectionModal from '../AiCharacterSelectionModal';

vi.mock('@/lib/api/character', () => ({
  getFixedCharacters: vi.fn(),
}));

const mockGetFixedCharacters = vi.mocked(getFixedCharacters);

const characters = [
  { id: 1, displayImageUrl: '/rabbit.png', type: 'RABBIT' },
  { id: 2, displayImageUrl: '/bear.png', type: 'BEAR' },
];

const renderModal = (
  overrides: Partial<React.ComponentProps<typeof AiCharacterSelectionModal>> = {},
) => {
  const props: React.ComponentProps<typeof AiCharacterSelectionModal> = {
    isOpen: true,
    isGenerating: false,
    onClose: vi.fn(),
    onGenerate: vi.fn(),
    ...overrides,
  };

  return {
    ...render(<AiCharacterSelectionModal {...props} />),
    props,
  };
};

describe('AiCharacterSelectionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFixedCharacters.mockResolvedValue(characters);
  });

  it('캐릭터를 조회하고 선택한 characterId로 생성을 확정한다', async () => {
    const { props } = renderModal();

    expect(
      screen.getByRole('dialog', { name: '캐릭터 선택' }),
    ).toBeInTheDocument();
    const generateButton = screen.getByRole('button', {
      name: 'AI 사진 생성',
    });
    expect(generateButton).toBeDisabled();

    const rabbitButton = await screen.findByRole('button', {
      name: 'RABBIT 캐릭터 선택',
    });
    fireEvent.click(rabbitButton);

    expect(rabbitButton).toHaveAttribute('aria-pressed', 'true');
    expect(generateButton).toBeEnabled();
    fireEvent.click(generateButton);

    expect(props.onGenerate).toHaveBeenCalledWith(1);
  });

  it('캐릭터 조회 중 로딩 상태를 표시한다', async () => {
    let resolveCharacters: ((value: typeof characters) => void) | undefined;
    mockGetFixedCharacters.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveCharacters = resolve;
        }),
    );

    renderModal();

    expect(screen.getByText('캐릭터를 불러오는 중...')).toBeInTheDocument();

    resolveCharacters?.(characters);
    expect(
      await screen.findByRole('button', { name: 'RABBIT 캐릭터 선택' }),
    ).toBeInTheDocument();
  });

  it('캐릭터 조회 실패를 안내하고 다시 불러온다', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockGetFixedCharacters
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(characters);

    renderModal();

    expect(
      await screen.findByText('캐릭터를 불러오지 못했어요.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));

    expect(
      await screen.findByRole('button', { name: 'RABBIT 캐릭터 선택' }),
    ).toBeInTheDocument();
    expect(mockGetFixedCharacters).toHaveBeenCalledTimes(2);
    consoleErrorSpy.mockRestore();
  });

  it('조회된 캐릭터가 없으면 빈 상태를 표시한다', async () => {
    mockGetFixedCharacters.mockResolvedValue([]);

    renderModal();

    expect(
      await screen.findByText('선택할 수 있는 캐릭터가 없어요.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'AI 사진 생성' }),
    ).toBeDisabled();
  });

  it('취소, 닫기 아이콘, backdrop, Escape로 닫을 수 있다', async () => {
    const { props } = renderModal();
    await screen.findByRole('button', { name: 'RABBIT 캐릭터 선택' });

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    vi.mocked(props.onClose).mockClear();
    fireEvent.click(screen.getByRole('button', { name: '캐릭터 선택 닫기' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    vi.mocked(props.onClose).mockClear();
    fireEvent.click(screen.getByTestId('ai-character-modal-overlay'));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    vi.mocked(props.onClose).mockClear();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('생성 중에는 선택 변경과 모든 닫기 동작을 막는다', async () => {
    const { props, rerender } = renderModal();
    const rabbitButton = await screen.findByRole('button', {
      name: 'RABBIT 캐릭터 선택',
    });
    fireEvent.click(rabbitButton);

    rerender(<AiCharacterSelectionModal {...props} isGenerating />);

    const bearButton = screen.getByRole('button', {
      name: 'BEAR 캐릭터 선택',
    });
    expect(bearButton).toBeDisabled();
    fireEvent.click(bearButton);
    expect(rabbitButton).toHaveAttribute('aria-pressed', 'true');

    expect(
      screen.getByRole('button', { name: 'AI 사진 생성 중...' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    fireEvent.click(screen.getByRole('button', { name: '캐릭터 선택 닫기' }));
    fireEvent.click(screen.getByTestId('ai-character-modal-overlay'));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(props.onClose).not.toHaveBeenCalled();
    expect(props.onGenerate).not.toHaveBeenCalled();
  });

  it('생성 중 상태를 dialog와 live status로 알린다', async () => {
    const { props, rerender } = renderModal();
    await screen.findByRole('button', { name: 'RABBIT 캐릭터 선택' });

    expect(screen.getByRole('dialog', { name: '캐릭터 선택' })).toHaveAttribute(
      'aria-busy',
      'false',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    rerender(<AiCharacterSelectionModal {...props} isGenerating />);

    expect(screen.getByRole('dialog', { name: '캐릭터 선택' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'AI 사진을 생성하는 중입니다.',
    );
  });

  it('모바일 바텀 시트와 데스크톱 중앙 모달 클래스를 함께 제공한다', () => {
    renderModal();

    expect(screen.getByTestId('ai-character-modal-overlay')).toHaveClass(
      'items-end',
      'sm:items-center',
    );
    expect(screen.getByRole('dialog', { name: '캐릭터 선택' })).toHaveClass(
      'rounded-t-2xl',
      'sm:rounded-2xl',
    );
  });

  it('열릴 때 dialog로 포커스를 이동하고 닫히면 이전 요소로 복구한다', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'AI 사진 열기';
    document.body.appendChild(trigger);
    trigger.focus();

    const { props, rerender } = renderModal();
    const dialog = screen.getByRole('dialog', { name: '캐릭터 선택' });

    expect(dialog).toHaveFocus();

    rerender(<AiCharacterSelectionModal {...props} isOpen={false} />);

    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('이전 포커스 요소가 비활성화되면 대체 요소로 포커스를 복구한다', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'AI 사진 열기';
    const fallbackButton = document.createElement('button');
    fallbackButton.textContent = '일기 작성 완료';
    const contentInput = document.createElement('textarea');
    document.body.append(trigger, fallbackButton, contentInput);
    contentInput.focus();

    const returnFocusRef = { current: trigger };
    const fallbackFocusRef = { current: fallbackButton };
    const { props, rerender } = renderModal({
      returnFocusRef,
      fallbackFocusRef,
    });

    trigger.disabled = true;
    rerender(<AiCharacterSelectionModal {...props} isOpen={false} />);

    expect(fallbackButton).toHaveFocus();
    trigger.remove();
    fallbackButton.remove();
    contentInput.remove();
  });

  it('닫힌 동안 상태를 초기화해 다시 열 때 이전 선택을 그리지 않는다', async () => {
    mockGetFixedCharacters
      .mockResolvedValueOnce(characters)
      .mockImplementationOnce(() => new Promise(() => {}));
    const container = document.createElement('div');
    const commitSnapshots: string[] = [];
    const props: React.ComponentProps<typeof AiCharacterSelectionModal> = {
      isOpen: true,
      isGenerating: false,
      onClose: vi.fn(),
      onGenerate: vi.fn(),
    };
    document.body.appendChild(container);
    const { rerender, unmount } = render(
      <Profiler
        id="ai-character-modal"
        onRender={() => {
          commitSnapshots.push(container.innerHTML);
        }}
      >
        <AiCharacterSelectionModal {...props} />
      </Profiler>,
      { container },
    );
    const rabbitButton = await screen.findByRole('button', {
      name: 'RABBIT 캐릭터 선택',
    });
    fireEvent.click(rabbitButton);
    expect(rabbitButton).toHaveAttribute('aria-pressed', 'true');

    rerender(
      <Profiler
        id="ai-character-modal"
        onRender={() => {
          commitSnapshots.push(container.innerHTML);
        }}
      >
        <AiCharacterSelectionModal {...props} isOpen={false} />
      </Profiler>,
    );
    commitSnapshots.length = 0;
    rerender(
      <Profiler
        id="ai-character-modal"
        onRender={() => {
          commitSnapshots.push(container.innerHTML);
        }}
      >
        <AiCharacterSelectionModal {...props} />
      </Profiler>,
    );

    await waitFor(() => {
      expect(mockGetFixedCharacters).toHaveBeenCalledTimes(2);
      expect(screen.getByText('캐릭터를 불러오는 중...')).toBeInTheDocument();
    });
    expect(
      commitSnapshots.some(snapshot =>
        snapshot.includes('aria-label="RABBIT 캐릭터 선택"'),
      ),
    ).toBe(false);
    unmount();
    container.remove();
  });

  it('Tab 포커스를 dialog 내부에서 순환시킨다', async () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: '캐릭터 선택' });
    const closeButton = screen.getByRole('button', {
      name: '캐릭터 선택 닫기',
    });
    const rabbitButton = await screen.findByRole('button', {
      name: 'RABBIT 캐릭터 선택',
    });
    const generateButton = screen.getByRole('button', {
      name: 'AI 사진 생성',
    });
    fireEvent.click(rabbitButton);

    closeButton.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(generateButton).toHaveFocus();

    generateButton.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(closeButton).toHaveFocus();
  });

  it('포커스가 dialog 밖으로 이동하면 dialog로 되돌린다', () => {
    const outsideButton = document.createElement('button');
    outsideButton.textContent = '배경 버튼';
    document.body.appendChild(outsideButton);

    renderModal();
    const dialog = screen.getByRole('dialog', { name: '캐릭터 선택' });
    outsideButton.focus();

    expect(dialog).toHaveFocus();
    outsideButton.remove();
  });

  it('생성 시작으로 현재 컨트롤이 비활성화되면 dialog로 포커스를 옮긴다', async () => {
    const { props, rerender } = renderModal();
    const rabbitButton = await screen.findByRole('button', {
      name: 'RABBIT 캐릭터 선택',
    });
    rabbitButton.focus();

    rerender(<AiCharacterSelectionModal {...props} isGenerating />);

    expect(screen.getByRole('dialog', { name: '캐릭터 선택' })).toHaveFocus();
  });

  it('닫혀 있으면 조회하거나 dialog를 표시하지 않는다', async () => {
    renderModal({ isOpen: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockGetFixedCharacters).not.toHaveBeenCalled();
    });
  });
});
