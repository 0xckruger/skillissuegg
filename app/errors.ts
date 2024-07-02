export enum TicTacToeErrorCode {
    TileOutOfBounds = 6000,
    TileAlreadySet = 6001,
    GameAlreadyOver = 6002,
    NotPlayersTurn = 6003,
    GameAlreadyStarted = 6004,
    GameNotOver = 6005,
    UnauthorizedUser = 6006,
    AmountMismatch = 6007,
    InvalidPlayerOne = 6008,
    InvalidPlayerTwo = 6009,
    EscrowAlreadyInitialized = 6010,
    EscrowNotInitialized = 6011,
    EscrowFundsPresent = 6012,
}

export const TicTacToeErrorMessage: { [key in TicTacToeErrorCode]: string } = {
    [TicTacToeErrorCode.TileOutOfBounds]: "Tile coordinates are out of bounds",
    [TicTacToeErrorCode.TileAlreadySet]: "Tile has already been played",
    [TicTacToeErrorCode.GameAlreadyOver]: "Game is already over",
    [TicTacToeErrorCode.NotPlayersTurn]: "It's not this player's turn",
    [TicTacToeErrorCode.GameAlreadyStarted]: "Game has already started",
    [TicTacToeErrorCode.GameNotOver]: "Game is currently in play",
    [TicTacToeErrorCode.UnauthorizedUser]: "Unauthorized user",
    [TicTacToeErrorCode.AmountMismatch]: "Deposited amounts do not match",
    [TicTacToeErrorCode.InvalidPlayerOne]: "Invalid player one account",
    [TicTacToeErrorCode.InvalidPlayerTwo]: "Invalid player two account",
    [TicTacToeErrorCode.EscrowAlreadyInitialized]: "Escrow account is already initialized",
    [TicTacToeErrorCode.EscrowNotInitialized]: "Escrow account is not initialized",
    [TicTacToeErrorCode.EscrowFundsPresent]: "Escrowed funds still present, please withdraw",
};

export function getErrorMessage(code: number): string {
    const errorCode = code as TicTacToeErrorCode;
    return TicTacToeErrorMessage[errorCode] || `Unknown error: ${code}`;
}