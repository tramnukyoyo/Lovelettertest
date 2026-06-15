/**
 * Scene primitives — the per-phase anatomy inside the GameShell stage.
 *
 *   <Scene>
 *     <SceneHeader>   badges · timer · question        (intrinsic height)
 *     <SceneBody>     the flexible region (flex:1, min-height:0)
 *     <SceneActions>  CTA — always visible, never pushed off-screen
 *   </Scene>
 *
 * OptionGrid: bounded lists (voting options, reveal cards). Rows are
 * content-sized with a clamped minimum and the group is centered — short
 * lists don't stretch into giant cards, long lists wrap into columns.
 */
import React from 'react';

export const Scene: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '',
  children,
}) => <div className={`gs-scene ${className}`}>{children}</div>;

export const SceneHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '',
  children,
}) => <div className={`gs-scene-header ${className}`}>{children}</div>;

export const SceneBody: React.FC<{
  className?: string;
  /** Center intrinsically-sized content (submitted states, banners). */
  centered?: boolean;
  children: React.ReactNode;
}> = ({ className = '', centered = false, children }) => (
  <div className={`gs-scene-body ${centered ? 'is-centered' : ''} ${className}`}>
    {children}
  </div>
);

export const SceneActions: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '',
  children,
}) => <div className={`gs-scene-actions ${className}`}>{children}</div>;

export const OptionGrid: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '',
  children,
}) => <div className={`gs-option-grid ${className}`}>{children}</div>;
