use anchor_lang::prelude::*;
use crate::errors::TicTacToeError;
use crate::state::game::TicTacToeGame;

pub fn end_game(ctx: Context<EndGame>) -> Result<()> {

    let game = &mut ctx.accounts.game;
    require!(!game.is_active(), TicTacToeError::GameNotOver);
    Ok(())
}

#[derive(Accounts)]
pub struct EndGame<'info> {
    #[account(
        mut,
        close = closer)]
    pub game: Account<'info, TicTacToeGame>,
    #[account(mut)]
    pub closer: Signer<'info>,
}