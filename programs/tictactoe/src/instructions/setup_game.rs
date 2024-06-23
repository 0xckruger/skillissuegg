use anchor_lang::prelude::*;
use crate::instructions::EscrowAccount;
use crate::state::game::TicTacToeGame;

pub fn setup_game(ctx: Context<SetupGame>) -> Result<()> {
    ctx.accounts.game.start([ctx.accounts.player_one.key(), ctx.accounts.player_two.key()])?;
    ctx.accounts.game.bump = ctx.bumps.game;
    ctx.accounts.escrow.initialize(ctx.accounts.player_one.key(), ctx.accounts.player_two.key(), ctx.bumps.escrow)?;

    Ok(())
}

#[derive(Accounts)]
pub struct SetupGame<'info> {
    #[account(
        init,
        payer = player_one,
        space = TicTacToeGame::MAXIMUM_SIZE + 8,
        seeds = [b"tictactoe", player_one.key().as_ref(), player_two.key().as_ref()],
        bump)]
    pub game: Account<'info, TicTacToeGame>,
    #[account(
        init,
        payer = player_one,
        space = 8 + 8 + 32 + 32 + 1 + 8 + 8,
        seeds = [b"escrow", game.key().as_ref()],
        bump)]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub player_one: Signer<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub player_two: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}