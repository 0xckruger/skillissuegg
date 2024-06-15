use anchor_lang::prelude::*;
use crate::state::game::TicTacToeGame;
use crate::errors::TicTacToeError;

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let game = &mut ctx.accounts.game;
    require!(game.turn == 1, TicTacToeError::GameAlreadyStarted);
    let user = &mut ctx.accounts.user;
    require!(user.key() == game.players[0] || user.key() == game.players[1], TicTacToeError::UnauthorizedUser);

    let escrow = &mut ctx.accounts.escrow;
    if escrow.player_one.key() == user.key() {
        escrow.amount1 = amount;
    } else if escrow.player_two.key() == user.key() {
        escrow.amount2 = amount;
    } else {
        return Err(TicTacToeError::UnauthorizedUser.into());
    }

    let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
        user.to_account_info().key,
        escrow.to_account_info().key,
        amount,
    );

    anchor_lang::solana_program::program::invoke(
        &transfer_instruction,
        &[
            user.to_account_info(),
            escrow.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    Ok(())
}

pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;

    if escrow.amount1 != escrow.amount2 {
        return Err(ErrorCode::AmountMismatch.into());
    }

    let winner = if ctx.accounts.clock.unix_timestamp % 2 == 0 {
        escrow.player_one
    } else {
        escrow.player_two
    };

    let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
        escrow.to_account_info().key,
        winner.key,
        escrow.amount1 + escrow.amount2,
    );

    anchor_lang::solana_program::program::invoke(
        &transfer_instruction,
        &[
            escrow.to_account_info(),
            winner,
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    escrow.amount1 = 0;
    escrow.amount2 = 0;

    Ok(())
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub game: Account<'info, TicTacToeGame>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct EscrowAccount {
    pub player_one: Pubkey,
    pub player_two: Pubkey,
    pub amount1: u64,
    pub amount2: u64,
}