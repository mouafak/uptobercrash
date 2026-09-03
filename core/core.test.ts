import { describe, expect, it } from 'vitest';

import { AFFILIATE, PROJECT, SALE } from '@/config/project';
import { deriveAffiliateCode, isValidAffiliateCodeFormat } from './affiliate';
import { BusinessError } from './errors';
import {
  LAMPORTS_PER_SOL,
  baseUnitsToDisplay,
  formatCompact,
  lamportsToSol,
  solToLamports,
} from './money';
import {
  commissionFor,
  isAmountValid,
  isSaleOpen,
  tokensForLamports,
} from './rules';

const TOKEN_UNIT = 10n ** BigInt(PROJECT.tokenDecimals);

describe('solToLamports', () => {
  it('convertit une fraction sans passer par un flottant', () => {
    expect(solToLamports('0.5')).toBe(500_000_000n);
  });

  it('convertit un entier', () => {
    expect(solToLamports('1')).toBe(1_000_000_000n);
  });

  it('accepte exactement neuf décimales', () => {
    expect(solToLamports('0.000000001')).toBe(1n);
  });

  it('rejette une dixième décimale', () => {
    expect(() => solToLamports('0.0000000001')).toThrow(BusinessError);
    try {
      solToLamports('0.0000000001');
    } catch (error) {
      expect((error as BusinessError).code).toBe('TOO_MANY_DECIMALS');
    }
  });

  it('rejette une chaîne qui n\'est pas un décimal', () => {
    for (const invalid of ['1.5.2', 'abc', '', '.5', '1.', '-1', '1e9']) {
      expect(() => solToLamports(invalid)).toThrow(BusinessError);
    }
  });

  it('ne perd rien sur un aller-retour', () => {
    expect(lamportsToSol(solToLamports('123.456789'))).toBe('123.456789');
  });
});

describe('tokensForLamports', () => {
  it('applique le taux configuré', () => {
    expect(tokensForLamports(LAMPORTS_PER_SOL)).toBe(SALE.tokensPerSol);
  });

  it('reste exact sur dix millions de tokens', () => {
    // 10 000 000 UP au taux configuré. Le résultat dépasse Number.MAX_SAFE_INTEGER :
    // c'est le test qui attrape une conversion accidentelle en flottant.
    const expected = 10_000_000n * TOKEN_UNIT;
    const lamports = (expected * LAMPORTS_PER_SOL) / SALE.tokensPerSol;

    expect(tokensForLamports(lamports)).toBe(expected);
    expect(expected > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);
  });
});

describe('commissionFor', () => {
  it('applique le taux en points de base', () => {
    expect(commissionFor(LAMPORTS_PER_SOL)).toBe(
      (LAMPORTS_PER_SOL * BigInt(AFFILIATE.commissionBasisPoints)) / 10_000n,
    );
  });

  it('arrondit vers le bas sans perte de précision', () => {
    // 999999999 * 1000 / 10000 = 99999999,9 -> 99999999
    expect(commissionFor(999_999_999n)).toBe(99_999_999n);
  });

  it('ne rend jamais plus que le montant parrainé', () => {
    expect(commissionFor(1n)).toBe(0n);
  });
});

describe('isAmountValid', () => {
  it('refuse zéro', () => {
    expect(isAmountValid(0n).ok).toBe(false);
  });

  it('refuse en dessous du minimum', () => {
    expect(isAmountValid(SALE.minLamports - 1n).ok).toBe(false);
  });

  it('accepte le minimum exact', () => {
    expect(isAmountValid(SALE.minLamports).ok).toBe(true);
  });

  it('accepte un très gros montant en l\'absence de plafond', () => {
    if (SALE.maxLamports === null) {
      expect(isAmountValid(1_000_000n * LAMPORTS_PER_SOL).ok).toBe(true);
    }
  });
});

describe('isSaleOpen', () => {
  it('est ouverte une seconde avant la fin', () => {
    expect(isSaleOpen(new Date(SALE.endsAt.getTime() - 1_000))).toBe(true);
  });

  it('est fermée à l\'instant exact de la fin', () => {
    expect(isSaleOpen(SALE.endsAt)).toBe(false);
  });
});

describe('deriveAffiliateCode', () => {
  const address = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

  it('est déterministe', () => {
    expect(deriveAffiliateCode(address)).toBe(deriveAffiliateCode(address));
  });

  it('produit un code au format attendu', () => {
    expect(isValidAffiliateCodeFormat(deriveAffiliateCode(address))).toBe(true);
  });

  it('distingue deux adresses', () => {
    expect(deriveAffiliateCode(address)).not.toBe(
      deriveAffiliateCode('11111111111111111111111111111111'),
    );
  });

  it('rejette les formats invalides', () => {
    for (const invalid of ['', 'ABCDEF12', 'zzzzzzzz', '1234567', '123456789']) {
      expect(isValidAffiliateCodeFormat(invalid)).toBe(false);
    }
  });
});

describe('affichage', () => {
  it('supprime les zéros de queue', () => {
    expect(baseUnitsToDisplay(1_500_000_000n, 9)).toBe('1.5');
    expect(baseUnitsToDisplay(1_000_000_000n, 9)).toBe('1');
  });

  it('abrège les grands nombres', () => {
    expect(formatCompact(1_500_000n * TOKEN_UNIT, 9)).toBe('1.5M');
    expect(formatCompact(2_000_000_000n * TOKEN_UNIT, 9)).toBe('2B');
  });

  it('laisse les petits nombres intacts', () => {
    expect(formatCompact(999n * TOKEN_UNIT, 9)).toBe('999');
  });
});
