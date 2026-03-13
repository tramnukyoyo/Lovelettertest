import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Lobby } from '../../types';
import type { BroadcastOverlays } from './StreamerSettingsPanel';
import { getBroadcastCopy } from './broadcastCopy';
import '../../styles/ps-streamer.css';

interface StreamerGameStageProps {
  lobby: Lobby;
  overlays: BroadcastOverlays;
  socket?: unknown;
}

const SOURCE_SCROLL_AREA_SELECTOR = '.main-scroll-area';
const SOURCE_ROOT_SELECTOR = '[data-hearts-gambit-root="true"]';
const SOURCE_ROOT_FALLBACK_SELECTOR = '.hearts-gambit-game:not(.hg-broadcast-view):not(.hg-broadcast-dom-clone)';
const MIRRORED_PORTAL_IDS = ['card-legend', 'rules', 'tutorial'] as const;
const MIRRORED_PORTAL_SELECTOR = MIRRORED_PORTAL_IDS
  .map(id => `[data-broadcast-mirror-portal="${id}"]`)
  .join(', ');
const MIRROR_DOM_CLASS = 'hg-broadcast-dom-clone';
const MIRROR_PORTAL_CLASS = 'hg-broadcast-portal-clone';
const MIRRORED_SCROLL_SELECTOR = '[data-mirror-scroll-region]';

type MirroredPortalId = typeof MIRRORED_PORTAL_IDS[number];

interface MirrorSourceContext {
  sourceWindow: Window | null;
  sourceDocument: Document | null;
  sourceRoot: HTMLElement | null;
}

function formatCopy(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function isElementNode(node: Node | null | undefined): node is Element {
  if (!node) {
    return false;
  }

  return node.nodeType === Node.ELEMENT_NODE;
}

function isMirroredElement(element: Element | null): boolean {
  if (!element) {
    return false;
  }

  return (
    element.classList.contains(MIRROR_DOM_CLASS)
    || element.classList.contains(MIRROR_PORTAL_CLASS)
    || Boolean(element.closest('.ps-broadcast-mirror'))
  );
}

function getMirroredPortalId(element: Element | null): MirroredPortalId | null {
  const portalId = element?.getAttribute('data-broadcast-mirror-portal') ?? null;

  if (!portalId) {
    return null;
  }

  return MIRRORED_PORTAL_IDS.includes(portalId as MirroredPortalId)
    ? portalId as MirroredPortalId
    : null;
}

function getCandidateWindows(mirrorRoot?: HTMLElement | null): Window[] {
  const runtimeWindow = window;
  const popupWindow = mirrorRoot?.ownerDocument.defaultView ?? null;
  const seen = new Set<Window>();

  return [
    popupWindow?.opener ?? null,
    runtimeWindow.opener ?? null,
    popupWindow,
    runtimeWindow,
  ].filter((candidate): candidate is Window => {
    if (!candidate || candidate.closed || seen.has(candidate)) {
      return false;
    }

    try {
      void candidate.document;
    } catch {
      return false;
    }

    seen.add(candidate);
    return true;
  });
}

function getSourceGameRootFromDocument(sourceDocument: Document): HTMLElement | null {
  const rootCandidate = sourceDocument.querySelector(SOURCE_ROOT_SELECTOR) as HTMLElement | null;
  if (rootCandidate && !isMirroredElement(rootCandidate)) {
    return rootCandidate;
  }

  const fallbackCandidate = Array.from(
    sourceDocument.querySelectorAll<HTMLElement>(SOURCE_ROOT_FALLBACK_SELECTOR)
  ).find(candidate => !isMirroredElement(candidate));
  if (fallbackCandidate) {
    return fallbackCandidate;
  }

  return Array.from(sourceDocument.querySelectorAll<HTMLElement>(SOURCE_SCROLL_AREA_SELECTOR))
    .find(candidate => !isMirroredElement(candidate))
    ?? null;
}

function resolveSourceContext(mirrorRoot?: HTMLElement | null): MirrorSourceContext {
  const candidateWindows = getCandidateWindows(mirrorRoot);

  for (const candidateWindow of candidateWindows) {
    const sourceRoot = getSourceGameRootFromDocument(candidateWindow.document);
    if (sourceRoot) {
      return {
        sourceWindow: candidateWindow,
        sourceDocument: candidateWindow.document,
        sourceRoot,
      };
    }
  }

  const fallbackWindow = candidateWindows[0] ?? null;
  return {
    sourceWindow: fallbackWindow,
    sourceDocument: fallbackWindow?.document ?? null,
    sourceRoot: null,
  };
}

function collectMirroredNodes(root: Node): Node[] {
  const nodes: Node[] = [root];
  const ownerDocument = root.ownerDocument ?? document;
  const walker = ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    nodes.push(current);
    current = walker.nextNode();
  }

  return nodes;
}

function getPairedNodes(sourceRoot: Node, mirroredRoot: Node): Array<[Node, Node]> | null {
  const sourceNodes = collectMirroredNodes(sourceRoot);
  const mirroredNodes = collectMirroredNodes(mirroredRoot);

  if (sourceNodes.length !== mirroredNodes.length) {
    return null;
  }

  const pairs: Array<[Node, Node]> = [];

  for (let index = 0; index < sourceNodes.length; index += 1) {
    const sourceNode = sourceNodes[index];
    const mirroredNode = mirroredNodes[index];

    if (sourceNode.nodeType !== mirroredNode.nodeType) {
      return null;
    }

    if (
      sourceNode.nodeType === Node.ELEMENT_NODE
      && mirroredNode.nodeType === Node.ELEMENT_NODE
      && (sourceNode as Element).tagName !== (mirroredNode as Element).tagName
    ) {
      return null;
    }

    pairs.push([sourceNode, mirroredNode]);
  }

  return pairs;
}

function syncElementAttributes(sourceEl: Element, mirroredEl: Element) {
  const sourceAttrs = Array.from(sourceEl.attributes)
    .filter(attr => attr.name !== 'data-hearts-gambit-root')
    .map(attr => [attr.name, attr.value] as const);
  const mirroredAttrNames = new Set(Array.from(mirroredEl.attributes).map(attr => attr.name));

  sourceAttrs.forEach(([name, value]) => {
    if (mirroredEl.getAttribute(name) !== value) {
      mirroredEl.setAttribute(name, value);
    }
    mirroredAttrNames.delete(name);
  });

  mirroredAttrNames.forEach(name => {
    if (name !== 'data-hearts-gambit-root') {
      mirroredEl.removeAttribute(name);
    }
  });
}

function syncMirroredNode(sourceNode: Node, mirroredNode: Node) {
  if (sourceNode.nodeType === Node.TEXT_NODE && mirroredNode.nodeType === Node.TEXT_NODE) {
    if (mirroredNode.textContent !== sourceNode.textContent) {
      mirroredNode.textContent = sourceNode.textContent;
    }
    return;
  }

  if (sourceNode.nodeType !== Node.ELEMENT_NODE || mirroredNode.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const sourceEl = sourceNode as Element;
  const mirroredEl = mirroredNode as Element;

  syncElementAttributes(sourceEl, mirroredEl);

  if (sourceEl.tagName === 'INPUT' && mirroredEl.tagName === 'INPUT') {
    const sourceInput = sourceEl as HTMLInputElement;
    const mirroredInput = mirroredEl as HTMLInputElement;

    if (mirroredInput.value !== sourceInput.value) mirroredInput.value = sourceInput.value;
    if (mirroredInput.checked !== sourceInput.checked) mirroredInput.checked = sourceInput.checked;
    if (mirroredInput.disabled !== sourceInput.disabled) mirroredInput.disabled = sourceInput.disabled;
  }

  if (sourceEl.tagName === 'TEXTAREA' && mirroredEl.tagName === 'TEXTAREA') {
    const sourceTextarea = sourceEl as HTMLTextAreaElement;
    const mirroredTextarea = mirroredEl as HTMLTextAreaElement;

    if (mirroredTextarea.value !== sourceTextarea.value) mirroredTextarea.value = sourceTextarea.value;
    if (mirroredTextarea.disabled !== sourceTextarea.disabled) mirroredTextarea.disabled = sourceTextarea.disabled;
  }

  if (sourceEl.tagName === 'SELECT' && mirroredEl.tagName === 'SELECT') {
    const sourceSelect = sourceEl as HTMLSelectElement;
    const mirroredSelect = mirroredEl as HTMLSelectElement;

    if (mirroredSelect.value !== sourceSelect.value) mirroredSelect.value = sourceSelect.value;
    if (mirroredSelect.disabled !== sourceSelect.disabled) mirroredSelect.disabled = sourceSelect.disabled;
  }

  if (sourceEl.tagName === 'IMG' && mirroredEl.tagName === 'IMG') {
    const sourceImage = sourceEl as HTMLImageElement;
    const mirroredImage = mirroredEl as HTMLImageElement;

    if (mirroredImage.currentSrc !== sourceImage.currentSrc && mirroredImage.src !== sourceImage.src) {
      mirroredImage.src = sourceImage.src;
    }
  }

  if ('scrollTop' in sourceEl && 'scrollTop' in mirroredEl) {
    const sourceScrollElement = sourceEl as HTMLElement;
    const mirroredScrollElement = mirroredEl as HTMLElement;

    if (mirroredScrollElement.scrollTop !== sourceScrollElement.scrollTop) {
      mirroredScrollElement.scrollTop = sourceScrollElement.scrollTop;
    }

    if (mirroredScrollElement.scrollLeft !== sourceScrollElement.scrollLeft) {
      mirroredScrollElement.scrollLeft = sourceScrollElement.scrollLeft;
    }
  }
}

function copyCustomProperties(sourceStyles: CSSStyleDeclaration, mirrorRoot: HTMLElement) {
  Array.from(sourceStyles).forEach(propertyName => {
    if (!propertyName.startsWith('--')) {
      return;
    }

    const value = sourceStyles.getPropertyValue(propertyName);
    if (value) {
      mirrorRoot.style.setProperty(propertyName, value);
    }
  });
}

function syncMirrorBackdrop(sourceRoot: HTMLElement, mirrorRoot: HTMLElement) {
  const sourceWindow = sourceRoot.ownerDocument.defaultView ?? window;
  const sourceDocument = sourceRoot.ownerDocument;
  const appRoot = sourceRoot.closest('.app-root') as HTMLElement | null;
  const backdropSource = appRoot ?? sourceRoot;
  const computed = sourceWindow.getComputedStyle(backdropSource);

  copyCustomProperties(sourceWindow.getComputedStyle(sourceDocument.documentElement), mirrorRoot);
  copyCustomProperties(sourceWindow.getComputedStyle(sourceDocument.body), mirrorRoot);
  copyCustomProperties(computed, mirrorRoot);

  mirrorRoot.style.setProperty('--ps-mirror-bg-color', computed.backgroundColor || 'transparent');
  mirrorRoot.style.setProperty('--ps-mirror-bg-image', computed.backgroundImage || 'none');
  mirrorRoot.style.setProperty('--ps-mirror-bg-position', computed.backgroundPosition || 'center');
  mirrorRoot.style.setProperty('--ps-mirror-bg-size', computed.backgroundSize || 'cover');
  mirrorRoot.style.setProperty('--ps-mirror-bg-repeat', computed.backgroundRepeat || 'no-repeat');
  mirrorRoot.style.setProperty('--ps-mirror-bg-attachment', computed.backgroundAttachment || 'scroll');
}

function syncScrollRegions(sourceRoot: ParentNode, mirrorRoot: ParentNode) {
  const sourceRegions = Array.from(sourceRoot.querySelectorAll<HTMLElement>(MIRRORED_SCROLL_SELECTOR));
  const mirroredRegions = Array.from(mirrorRoot.querySelectorAll<HTMLElement>(MIRRORED_SCROLL_SELECTOR));

  if (sourceRegions.length !== mirroredRegions.length) {
    return false;
  }

  for (let index = 0; index < sourceRegions.length; index += 1) {
    const sourceRegion = sourceRegions[index];
    const mirroredRegion = mirroredRegions[index];

    if (mirroredRegion.scrollTop !== sourceRegion.scrollTop) {
      mirroredRegion.scrollTop = sourceRegion.scrollTop;
    }

    if (mirroredRegion.scrollLeft !== sourceRegion.scrollLeft) {
      mirroredRegion.scrollLeft = sourceRegion.scrollLeft;
    }
  }

  return true;
}

function getSourcePortals(sourceDocument: Document) {
  return MIRRORED_PORTAL_IDS
    .map(portalId => sourceDocument.querySelector<HTMLElement>(`[data-broadcast-mirror-portal="${portalId}"]`))
    .filter((node): node is HTMLElement => Boolean(node) && !isMirroredElement(node));
}

function getMirroredGameRoot(mirrorRoot: HTMLElement) {
  return mirrorRoot.querySelector(`:scope > .${MIRROR_DOM_CLASS}`) as HTMLElement | null;
}

function getMirroredPortals(mirrorRoot: HTMLElement) {
  const portalMap = new Map<MirroredPortalId, HTMLElement>();

  Array.from(mirrorRoot.querySelectorAll<HTMLElement>(`:scope > .${MIRROR_PORTAL_CLASS}`)).forEach(portal => {
    const portalId = getMirroredPortalId(portal);
    if (portalId) {
      portalMap.set(portalId, portal);
    }
  });

  return portalMap;
}

function isRelevantMirrorNode(node: Node | null, sourceRoot: HTMLElement | null): boolean {
  if (!node) {
    return false;
  }

  if (sourceRoot) {
    if (node === sourceRoot || sourceRoot.contains(node)) {
      return true;
    }

    if (isElementNode(node) && node.contains(sourceRoot)) {
      return true;
    }
  }

  if (isElementNode(node)) {
    if (node.matches(MIRRORED_PORTAL_SELECTOR) || Boolean(node.closest(MIRRORED_PORTAL_SELECTOR))) {
      return true;
    }
  }

  return false;
}

function rebuildMirroredGameDom(sourceRoot: HTMLElement, mirrorRoot: HTMLElement) {
  const ownerDocument = mirrorRoot.ownerDocument;
  const mirroredGameRoot = ownerDocument.importNode(sourceRoot, true) as HTMLElement;
  const sourceDocument = sourceRoot.ownerDocument;
  const sourcePortals = getSourcePortals(sourceDocument);

  mirroredGameRoot.classList.add(MIRROR_DOM_CLASS);
  mirroredGameRoot.removeAttribute('data-hearts-gambit-root');

  const mirroredPortals = sourcePortals.map(portal => {
    const clonedPortal = ownerDocument.importNode(portal, true) as HTMLElement;
    clonedPortal.classList.add(MIRROR_PORTAL_CLASS);
    return clonedPortal;
  });

  mirrorRoot.replaceChildren(mirroredGameRoot, ...mirroredPortals);
  syncMirrorBackdrop(sourceRoot, mirrorRoot);
  syncMirroredScrollState(sourceRoot, mirrorRoot);
}

function syncMirroredScrollState(sourceRoot: HTMLElement, mirrorRoot: HTMLElement): boolean {
  const mirroredGameRoot = getMirroredGameRoot(mirrorRoot);

  if (!mirroredGameRoot) {
    return false;
  }

  if (!syncScrollRegions(sourceRoot, mirroredGameRoot)) {
    return false;
  }

  const sourcePortals = getSourcePortals(sourceRoot.ownerDocument);
  const mirroredPortals = getMirroredPortals(mirrorRoot);

  if (sourcePortals.length !== mirroredPortals.size) {
    return false;
  }

  for (const sourcePortal of sourcePortals) {
    const portalId = getMirroredPortalId(sourcePortal);
    const mirroredPortal = portalId ? mirroredPortals.get(portalId) : null;

    if (!portalId || !mirroredPortal || !syncScrollRegions(sourcePortal, mirroredPortal)) {
      return false;
    }
  }

  return true;
}

function syncMirroredTrees(sourceRoot: HTMLElement, mirrorRoot: HTMLElement): boolean {
  const mirroredGameRoot = getMirroredGameRoot(mirrorRoot);
  const sourceDocument = sourceRoot.ownerDocument;

  if (!mirroredGameRoot) {
    return false;
  }

  const rootPairs = getPairedNodes(sourceRoot, mirroredGameRoot);
  if (!rootPairs) {
    return false;
  }

  rootPairs.forEach(([sourceNode, mirroredNode]) => {
    syncMirroredNode(sourceNode, mirroredNode);
  });

  const sourcePortals = getSourcePortals(sourceDocument);
  const mirroredPortals = getMirroredPortals(mirrorRoot);

  if (sourcePortals.length !== mirroredPortals.size) {
    return false;
  }

  for (const sourcePortal of sourcePortals) {
    const portalId = getMirroredPortalId(sourcePortal);
    const mirroredPortal = portalId ? mirroredPortals.get(portalId) : null;

    if (!portalId || !mirroredPortal) {
      return false;
    }

    const portalPairs = getPairedNodes(sourcePortal, mirroredPortal);
    if (!portalPairs) {
      return false;
    }

    portalPairs.forEach(([sourceNode, mirroredNode]) => {
      syncMirroredNode(sourceNode, mirroredNode);
    });
  }

  if (!syncMirroredScrollState(sourceRoot, mirrorRoot)) return false;

  syncMirrorBackdrop(sourceRoot, mirrorRoot);
  return true;
}

const LiveHeartsGambitMirror: React.FC<{
  fallback?: React.ReactNode;
  preserveLastFrame?: boolean;
}> = ({ fallback, preserveLastFrame = false }) => {
  const mirrorRootRef = useRef<HTMLDivElement | null>(null);
  const hasSourceRef = useRef(false);
  const syncFrameRef = useRef<number | null>(null);
  const [hasSource, setHasSource] = useState(false);

  const updateHasSource = useCallback((nextValue: boolean) => {
    if (hasSourceRef.current === nextValue) {
      return;
    }

    hasSourceRef.current = nextValue;
    setHasSource(nextValue);
  }, []);

  const clearMirror = useCallback(() => {
    const mirrorRoot = mirrorRootRef.current;
    if (!mirrorRoot) return;

    mirrorRoot.replaceChildren();
    updateHasSource(false);
  }, [updateHasSource]);

  const syncMirror = useCallback(() => {
    const mirrorRoot = mirrorRootRef.current;
    const { sourceRoot } = resolveSourceContext(mirrorRoot);

    if (!mirrorRoot || !sourceRoot) {
      if (preserveLastFrame && hasSourceRef.current && mirrorRoot?.childNodes.length) {
        return;
      }
      clearMirror();
      return;
    }

    try {
      if (!syncMirroredTrees(sourceRoot, mirrorRoot)) {
        rebuildMirroredGameDom(sourceRoot, mirrorRoot);
      }

      updateHasSource(true);
    } catch {
      rebuildMirroredGameDom(sourceRoot, mirrorRoot);
      updateHasSource(true);
    }
  }, [clearMirror, preserveLastFrame, updateHasSource]);

  const queueStateSync = useCallback(() => {
    if (syncFrameRef.current !== null) {
      return;
    }

    syncFrameRef.current = window.requestAnimationFrame(() => {
      syncFrameRef.current = null;
      syncMirror();
    });
  }, [syncMirror]);

  const syncMirrorScrolls = useCallback(() => {
    const mirrorRoot = mirrorRootRef.current;
    const { sourceRoot } = resolveSourceContext(mirrorRoot);

    if (!mirrorRoot || !sourceRoot || !hasSourceRef.current) {
      return;
    }

    if (!syncMirroredScrollState(sourceRoot, mirrorRoot)) {
      queueStateSync();
    }
  }, [queueStateSync]);

  useEffect(() => {
    syncMirror();
    const syncIntervalId = window.setInterval(queueStateSync, 250);

    const mirrorRoot = mirrorRootRef.current;
    const { sourceDocument, sourceWindow } = resolveSourceContext(mirrorRoot);

    if (!sourceDocument?.body) {
      return () => {
        window.clearInterval(syncIntervalId);
        if (syncFrameRef.current !== null) {
          window.cancelAnimationFrame(syncFrameRef.current);
        }
      };
    }

    const mutationObserver = new MutationObserver((records: MutationRecord[]) => {
      const { sourceRoot } = resolveSourceContext(mirrorRootRef.current);
      const hasRelevantChange = records.some((record: MutationRecord) => {
        if (!isRelevantMirrorNode(record.target, sourceRoot)) {
          const addedRelevant = 'addedNodes' in record
            && Array.from(record.addedNodes).some(node => isRelevantMirrorNode(node, sourceRoot));
          const removedRelevant = 'removedNodes' in record
            && Array.from(record.removedNodes).some(node => isRelevantMirrorNode(node, sourceRoot));
          return addedRelevant || removedRelevant;
        }

        return true;
      });

      if (hasRelevantChange) {
        queueStateSync();
      }
    });

    mutationObserver.observe(sourceDocument.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    const onScroll = () => syncMirrorScrolls();
    const onResize = () => queueStateSync();
    const onWheel = () => syncMirrorScrolls();
    const onTouchMove = () => syncMirrorScrolls();

    sourceDocument.addEventListener('scroll', onScroll, true);
    sourceDocument.addEventListener('wheel', onWheel, true);
    sourceDocument.addEventListener('touchmove', onTouchMove, true);
    (sourceWindow ?? window).addEventListener('resize', onResize);

    return () => {
      mutationObserver.disconnect();
      sourceDocument.removeEventListener('scroll', onScroll, true);
      sourceDocument.removeEventListener('wheel', onWheel, true);
      sourceDocument.removeEventListener('touchmove', onTouchMove, true);
      (sourceWindow ?? window).removeEventListener('resize', onResize);
      window.clearInterval(syncIntervalId);
      if (syncFrameRef.current !== null) {
        window.cancelAnimationFrame(syncFrameRef.current);
      }
    };
  }, [queueStateSync, syncMirror, syncMirrorScrolls]);

  return (
    <div className={`ps-broadcast-mirror-frame${hasSource ? ' has-source' : ''}`}>
      <div
        ref={mirrorRootRef}
        className={`ps-broadcast-mirror${hasSource ? ' has-source' : ''}`}
        aria-hidden="true"
      />
      {!hasSource && fallback}
    </div>
  );
};

const StreamerGameStage: React.FC<StreamerGameStageProps> = ({ lobby, overlays }) => {
  const copy = getBroadcastCopy();
  const connectedPlayers = lobby.players.filter(player => player.connected).length;

  return (
    <div className="streamer-game-stage ps-stage ps-stage-mirror">
      <div className="streamer-stage-content">
        <LiveHeartsGambitMirror
          preserveLastFrame={lobby.state !== 'LOBBY'}
          fallback={lobby.state === 'LOBBY' ? (
            <div className="ps-broadcast-mirror-fallback">
              <div className="streamer-stage-inner stage-waiting">
                <h2 className="streamer-stage-title">{copy.stage.waitingForPlayers}</h2>
                <p className="streamer-stage-subtitle">
                  {formatCopy(copy.stage.playersInLobby, {
                    count: connectedPlayers,
                    s: connectedPlayers === 1 ? '' : 's',
                  })}
                </p>
                {overlays.roomCode && (
                  <span className="streamer-room-code">#{lobby.code}</span>
                )}
              </div>
            </div>
          ) : null}
        />
      </div>
    </div>
  );
};

export default StreamerGameStage;
