import { SWAP_PROGRAMS, NFT_PROGRAMS, DEFI_PROGRAMS, SYSTEM_PROGRAM, TOKEN_PROGRAM, TOKEN_2022, ASSOCIATED_TOKEN, COMPUTE_BUDGET } from '../constants/programs';

export type TxCategory = 'Swap' | 'Transfer' | 'NFT' | 'DeFi' | 'Failed' | 'Unknown';

/** Collect all invoked program IDs from top-level and inner instructions. */
function extractProgramIds(tx: any): Set<string> {
  const ids = new Set<string>();
  const instructions = tx.transaction?.message?.instructions ?? [];
  const innerInstructions = tx.meta?.innerInstructions ?? [];

  for (const ix of instructions) {
    if (ix.programId) ids.add(ix.programId.toString());
  }
  for (const group of innerInstructions) {
    for (const ix of group.instructions ?? []) {
      if (ix.programId) ids.add(ix.programId.toString());
    }
  }
  return ids;
}

const NON_SEMANTIC_PROGRAMS = new Set([
  SYSTEM_PROGRAM, TOKEN_PROGRAM, TOKEN_2022, ASSOCIATED_TOKEN, COMPUTE_BUDGET,
]);

function hasMatch(ids: Set<string>, known: Set<string>): boolean {
  for (const id of ids) if (known.has(id)) return true;
  return false;
}

export function categorizeTransaction(tx: any): TxCategory {
  // Failed takes priority — always show regardless of programs involved
  if (tx.meta?.err) return 'Failed';

  const programIds = extractProgramIds(tx);

  if (hasMatch(programIds, SWAP_PROGRAMS)) return 'Swap';
  if (hasMatch(programIds, NFT_PROGRAMS))  return 'NFT';
  if (hasMatch(programIds, DEFI_PROGRAMS)) return 'DeFi';

  // Transfer: only system/token bookkeeping programs, with an actual balance change
  const semanticPrograms = [...programIds].filter((id) => !NON_SEMANTIC_PROGRAMS.has(id));
  if (semanticPrograms.length === 0) {
    const pre  = tx.meta?.preBalances  ?? [];
    const post = tx.meta?.postBalances ?? [];
    const hasBalanceChange = pre.some((v: number, i: number) => Math.abs(v - (post[i] ?? 0)) > 5000);
    if (hasBalanceChange) return 'Transfer';
  }

  return 'Unknown';
}
