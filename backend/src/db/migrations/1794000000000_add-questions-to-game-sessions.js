exports.up = (pgm) => {
  pgm.addColumn('game_sessions', {
    questions: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'[]'::jsonb")
    }
  });
  pgm.addColumn('game_answers', {
    penalty_ms: { type: 'integer', notNull: true, default: 0 }
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('game_answers', 'penalty_ms');
  pgm.dropColumn('game_sessions', 'questions');
};
