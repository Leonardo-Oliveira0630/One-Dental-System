const fs = require('fs');
let content = fs.readFileSync('components/Scanner.tsx', 'utf8');

content = content.replace(
`                                        })}
                                    </div>
                                )}}
                            </div>`,
`                                        })}
                                    </div>
                                )}
                            </div>`
);

fs.writeFileSync('components/Scanner.tsx', content);
