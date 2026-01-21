-- Adicionar coluna display_order à tabela tooltip_contents
ALTER TABLE tooltip_contents 
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Atualizar ordem cronológica inicial dos eventos históricos
UPDATE tooltip_contents SET display_order = 1 WHERE section_id = 'history-talos';
UPDATE tooltip_contents SET display_order = 2 WHERE section_id = 'history-telegraph';
UPDATE tooltip_contents SET display_order = 3 WHERE section_id = 'history-turing-machine';
UPDATE tooltip_contents SET display_order = 4 WHERE section_id = 'history-enigma';
UPDATE tooltip_contents SET display_order = 5 WHERE section_id = 'history-turing-test';
UPDATE tooltip_contents SET display_order = 6 WHERE section_id = 'history-arpanet';
UPDATE tooltip_contents SET display_order = 7 WHERE section_id = 'history-tcpip';
UPDATE tooltip_contents SET display_order = 8 WHERE section_id = 'history-www';
UPDATE tooltip_contents SET display_order = 9 WHERE section_id = 'history-web2';
UPDATE tooltip_contents SET display_order = 10 WHERE section_id = 'history-watson';
UPDATE tooltip_contents SET display_order = 11 WHERE section_id = 'history-openai';
UPDATE tooltip_contents SET display_order = 12 WHERE section_id = 'history-gpt3';
UPDATE tooltip_contents SET display_order = 13 WHERE section_id = 'history-chatgpt';
UPDATE tooltip_contents SET display_order = 14 WHERE section_id = 'history-current';