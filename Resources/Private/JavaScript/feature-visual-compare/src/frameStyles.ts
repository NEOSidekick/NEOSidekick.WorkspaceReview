/**
 * Styles for the markers inside a rendered page. They travel with the script,
 * because that document is the site's own, not the module's.
 */
export const FRAME_STYLES = [
    '.neosidekick-review-overlay{position:absolute;top:0;left:0;width:100%;height:0;overflow:visible;pointer-events:none;z-index:2147483000}',
    '.neosidekick-review-halo{position:absolute;box-sizing:border-box;border:3px solid var(--neosidekick-review-colour);border-radius:4px;box-shadow:0 0 0 2px rgba(255,255,255,.75)}',
    '.neosidekick-review-halo--created{--neosidekick-review-colour:#00a338}',
    '.neosidekick-review-halo--edited{--neosidekick-review-colour:#ff8700}',
    '.neosidekick-review-halo--moved{--neosidekick-review-colour:#00b5ff}',
    '.neosidekick-review-halo--hidden{--neosidekick-review-colour:#8c8c8c;background:repeating-linear-gradient(135deg,rgba(140,140,140,.28) 0 6px,transparent 6px 14px)}',
    '.neosidekick-review-halo--deleted{--neosidekick-review-colour:#ff460d;background:rgba(255,70,13,.28)}',
    '.neosidekick-review-halo--active{box-shadow:0 0 0 3px #fff,0 0 0 6px var(--neosidekick-review-colour)}',
    '.neosidekick-review-halo__label{position:absolute;top:-13px;left:8px;max-width:calc(100% - 16px);margin:0;padding:2px 8px;border:0;border-radius:10px;background:var(--neosidekick-review-colour);font:600 11px/16px "Noto Sans",sans-serif;letter-spacing:.02em;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:auto;cursor:pointer}',
    '.neosidekick-review-halo--hidden .neosidekick-review-halo__label{color:#141414}',
    '.neosidekick-review-halo__label:hover,.neosidekick-review-halo__label:focus-visible{outline:2px solid #141414;outline-offset:1px}',
    '.neosidekick-review-diff ins{background:#dff2e4;color:#0f5132;text-decoration:underline;text-decoration-color:#0f5132;text-decoration-thickness:2px;text-underline-offset:2px;padding:0 2px;border-radius:2px}',
    '.neosidekick-review-diff del{background:#fbe7e7;color:#96262b;text-decoration:line-through;text-decoration-color:#96262b;padding:0 2px;border-radius:2px}',
    '.neosidekick-review-sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}',
    '.neosidekick-review-ellipsis{color:#9a9a9a;padding:0 4px}',
    '.neosidekick-review-unplaced{margin:24px;padding:16px;border:2px dashed #ff460d;border-radius:4px}',
    '.neosidekick-review-unplaced__title{margin:0 0 12px;font:600 14px/20px "Noto Sans",sans-serif;color:#96262b}',
].join('\n');
