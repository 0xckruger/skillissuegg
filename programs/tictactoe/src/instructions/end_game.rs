use anchor_lang::prelude::*;
use crate::errors::TicTacToeError;
use crate::instructions::EscrowAccount;
use crate::state::game::TicTacToeGame;

pub fn end_game(ctx: Context<EndGame>) -> Result<()> {

    let game = &mut ctx.accounts.game;
    require!(!game.is_active(), TicTacToeError::GameNotOver);
    let escrow = &mut ctx.accounts.escrow;
    require!(escrow.amount1 == 0 && escrow.amount2 == 0, TicTacToeError::EscrowFundsPresent);
    Ok(())
}

#[derive(Accounts)]
pub struct EndGame<'info> {
    #[account(
        mut,
        close = closer)]
    pub game: Account<'info, TicTacToeGame>,
    #[account(
        mut,
        close = closer)]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub closer: Signer<'info>,
}