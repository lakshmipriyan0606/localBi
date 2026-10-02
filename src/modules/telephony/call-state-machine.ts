import { CallStatus } from './telephony-types';

export class CallStateMachine {
  private static readonly PRECEDENCE: Record<CallStatus, number> = {
    INITIATED: 1,
    RINGING: 2,
    ANSWERED: 3,
    COMPLETED: 4,
    MISSED: 4,
    BUSY: 4,
    FAILED: 4,
    CANCELLED: 4,
  };

  private static readonly TERMINAL_STATES: ReadonlySet<CallStatus> = new Set([
    'COMPLETED',
    'MISSED',
    'BUSY',
    'FAILED',
    'CANCELLED',
  ]);

  /**
   * Checks whether a status is terminal.
   */
  public static isTerminal(status: CallStatus): boolean {
    return this.TERMINAL_STATES.has(status);
  }

  /**
   * Validates whether transition from currentState to nextState is permitted.
   */
  public static canTransition(current: CallStatus, next: CallStatus): boolean {
    if (current === next) return true;

    // Terminal states cannot regress to earlier non-terminal states
    if (this.isTerminal(current) && !this.isTerminal(next)) {
      return false;
    }

    const currentRank = this.PRECEDENCE[current] ?? 0;
    const nextRank = this.PRECEDENCE[next] ?? 0;

    return nextRank >= currentRank;
  }

  /**
   * Resolves the appropriate next status, handling out-of-order events.
   * If an earlier event arrives late (e.g., ANSWERED after COMPLETED),
   * the terminal status is preserved.
   */
  public static resolveNextStatus(
    currentStatus: CallStatus,
    incomingStatus: CallStatus,
    currentStartedAt?: Date,
    incomingOccurredAt?: Date
  ): {
    nextStatus: CallStatus;
    isOutOfOrder: boolean;
  } {
    // If already terminal and incoming is non-terminal -> out-of-order, keep terminal
    if (this.isTerminal(currentStatus) && !this.isTerminal(incomingStatus)) {
      return {
        nextStatus: currentStatus,
        isOutOfOrder: true,
      };
    }

    // If timestamps are provided and incoming occurred BEFORE current start/event
    if (currentStartedAt && incomingOccurredAt && incomingOccurredAt < currentStartedAt) {
      if (this.PRECEDENCE[incomingStatus] < this.PRECEDENCE[currentStatus]) {
        return {
          nextStatus: currentStatus,
          isOutOfOrder: true,
        };
      }
    }

    // If incoming has higher precedence
    if (this.PRECEDENCE[incomingStatus] > this.PRECEDENCE[currentStatus]) {
      return {
        nextStatus: incomingStatus,
        isOutOfOrder: false,
      };
    }

    // If both are terminal (e.g. COMPLETED vs FAILED), preserve COMPLETED
    if (this.isTerminal(currentStatus) && this.isTerminal(incomingStatus)) {
      if (currentStatus === 'COMPLETED') {
        return { nextStatus: 'COMPLETED', isOutOfOrder: incomingStatus !== 'COMPLETED' };
      }
      return { nextStatus: incomingStatus, isOutOfOrder: false };
    }

    return {
      nextStatus: incomingStatus,
      isOutOfOrder: false,
    };
  }
}
